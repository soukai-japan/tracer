<template>
  <div class="passage-view">
    <h1>日语文章段落学习</h1>
    <div class="passage-list">
      <div
        v-for="passage in passageList"
        :key="passage.id"
        class="passage-item"
        @click="passage.id && goToPassageDetail(passage.id)"
      >
        <h3 v-if="isURL(passage.source)">
          <a :href="passage.source" target="_blank" rel="noopener noreferrer" @click.stop>{{
            passage.name
          }}</a>
        </h3>
        <h3 v-else>{{ passage.name }}</h3>
        <p class="first-segment">原文: {{ passage.firstSegmentContent }}</p>
        <p class="created-at">
          {{ passage.createdAt ? new Date(passage.createdAt).toLocaleDateString() : '' }}
        </p>
      </div>
      <div v-if="isLoadingPassages" class="loading-more">
        <span>加载更多文章...</span>
      </div>
      <div v-if="!hasMorePassages && passageList.length > 0" class="no-more">
        <span>没有更多文章了</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { db } from '@/services/db'
import type { Passage as DbPassage } from '@/services/db'

interface DisplayPassage extends Omit<DbPassage, 'content' | 'translation'> {
  content: string
  translation: string
  firstSegmentContent?: string
  firstSegmentTranslation?: string
}

const passageList = ref<DisplayPassage[]>([])
const currentPage = ref(1)
const pageSize = 10
const hasMorePassages = ref(true)
const isLoadingPassages = ref(false)

const router = useRouter()

onMounted(async () => {
  await loadPassages()
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll)
})

const loadPassages = async () => {
  if (!hasMorePassages.value || isLoadingPassages.value) return

  isLoadingPassages.value = true
  try {
    const offset = (currentPage.value - 1) * pageSize
    const newPassages = await db.passages
      .orderBy('createdAt')
      .reverse()
      .offset(offset)
      .limit(pageSize)
      .toArray()

    const displayPassages: DisplayPassage[] = []
    for (const p of newPassages) {
      if (p.id !== undefined) {
        const firstSegment = await db.passageContents
          .where({ passageId: p.id, segmentIndex: 0 })
          .first()
        displayPassages.push({
          ...p,
          content: '',
          translation: '',
          firstSegmentContent: firstSegment?.content || '',
          firstSegmentTranslation: firstSegment?.translation || '',
        })
      }
    }
    console.log('Loaded passages for list view:', displayPassages)

    if (newPassages.length < pageSize) {
      hasMorePassages.value = false
    }

    if (currentPage.value === 1) {
      passageList.value = displayPassages
    } else {
      passageList.value = [...passageList.value, ...displayPassages]
    }

    currentPage.value++
  } catch (error) {
    console.error('加载文章失败:', error)
  } finally {
    isLoadingPassages.value = false
  }
}

const handleScroll = () => {
  const scrollHeight = document.documentElement.scrollHeight
  const scrollTop = document.documentElement.scrollTop
  const clientHeight = document.documentElement.clientHeight

  if (scrollTop + clientHeight >= scrollHeight - 100) {
    loadPassages()
  }
}

const goToPassageDetail = (id: number) => {
  router.push({ name: 'passage-content', params: { id } })
}

const isURL = (str: string | undefined): boolean => {
  if (!str) return false
  try {
    new URL(str)
    return true
  } catch (error) {
    console.error('Invalid URL:', error)
    return false
  }
}
</script>

<style scoped>
.passage-view {
  padding: 20px;
}
.passage-list {
  margin: 20px 0;
}
.passage-item {
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  position: relative;
}

.passage-item .created-at {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 12px;
  color: #666;
}
.passage-item:hover {
  background-color: #f5f5f5;
}

.loading-more,
.no-more {
  text-align: center;
  padding: 20px;
  color: #666;
  font-size: 14px;
}

.loading-more {
  background-color: #f8f9fa;
  border-radius: 4px;
  margin: 10px 0;
}

.no-more {
  border-top: 1px solid #eee;
  margin-top: 20px;
}
</style>
