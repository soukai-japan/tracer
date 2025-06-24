<template>
  <div class="stats-view">
    <h1>数据统计</h1>
    <div class="stats-cards">
      <div class="stat-card">
        <h2>总单词数</h2>
        <p>{{ totalWords }}</p>
      </div>
      <div class="stat-card">
        <h2>总语法数</h2>
        <p>{{ totalGrammars }}</p>
      </div>
      <div class="stat-card">
        <h2>总文章数</h2>
        <p>{{ totalPassages }}</p>
      </div>
    </div>

    <div class="daily-stats">
      <h2>每日新增统计</h2>
      <div v-if="Object.keys(dailyNewWords).length > 0">
        <h3>单词</h3>
        <ul>
          <li v-for="(count, date) in dailyNewWords" :key="date">{{ date }}: {{ count }} 个</li>
        </ul>
      </div>
      <div v-if="Object.keys(dailyNewGrammars).length > 0">
        <h3>语法</h3>
        <ul>
          <li v-for="(count, date) in dailyNewGrammars" :key="date">{{ date }}: {{ count }} 个</li>
        </ul>
      </div>
      <div v-if="Object.keys(dailyNewPassages).length > 0">
        <h3>文章</h3>
        <ul>
          <li v-for="(count, date) in dailyNewPassages" :key="date">{{ date }}: {{ count }} 篇</li>
        </ul>
      </div>
      <p v-else>暂无每日新增数据。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'

const totalWords = ref(0)
const totalGrammars = ref(0)
const totalPassages = ref(0)

const dailyNewWords = ref<Record<string, number>>({})
const dailyNewGrammars = ref<Record<string, number>>({})
const dailyNewPassages = ref<Record<string, number>>({})

onMounted(async () => {
  await loadStats()
})

const loadStats = async () => {
  // 总数统计
  totalWords.value = await db.words.count()
  totalGrammars.value = await db.grammars.count()
  totalPassages.value = await db.passages.count()

  // 每日新增统计
  const words = await db.words.toArray()
  dailyNewWords.value = calculateDailyStats(words)

  const grammars = await db.grammars.toArray()
  dailyNewGrammars.value = calculateDailyStats(grammars)

  const passages = await db.passages.toArray()
  dailyNewPassages.value = calculateDailyStats(passages)
}

const calculateDailyStats = (items: { createdAt?: Date }[]) => {
  const stats: Record<string, number> = {}
  items.forEach((item) => {
    if (item.createdAt) {
      const date = new Date(item.createdAt).toLocaleDateString() // 获取日期字符串
      stats[date] = (stats[date] || 0) + 1
    }
  })
  return stats
}
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.stats-cards {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background-color: #f0f8ff;
  border: 1px solid #b0e0e6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  flex: 1;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.stat-card h2 {
  font-size: 1.5em;
  color: #2c3e50;
  margin-bottom: 10px;
}

.stat-card p {
  font-size: 2.5em;
  font-weight: bold;
  color: #41b883;
}

.daily-stats {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
}

.daily-stats h2 {
  font-size: 1.8em;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.daily-stats h3 {
  font-size: 1.2em;
  color: #555;
  margin-top: 15px;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.daily-stats ul {
  list-style: none;
  padding: 0;
}

.daily-stats li {
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.daily-stats li:last-child {
  border-bottom: none;
}

.daily-stats p {
  text-align: center;
  color: #777;
  font-style: italic;
}
</style>
