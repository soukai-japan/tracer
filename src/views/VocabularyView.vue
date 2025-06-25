<template>
  <div class="vocabulary-view">
    <h1>日语单词学习</h1>
    <div class="tag-filter-container">
      <span
        class="tag-filter-item"
        :class="{ active: filterTagId === undefined }"
        @click="filterTagId = undefined"
        >全部</span
      >
      <span
        class="tag-filter-item"
        :class="{ active: filterTagId === -1 }"
        @click="filterTagId = -1"
        >未分类</span
      >
      <span
        v-for="tag in allTags"
        :key="tag.id"
        class="tag-filter-item"
        :class="{ active: filterTagId === tag.id }"
        @click="tag.id !== undefined && (filterTagId = tag.id)"
      >
        {{ tag.name }}
        <span
          v-if="tag.id !== undefined"
          class="delete-tag-button filter-tag-delete-button"
          @click.stop="deleteTag(tag.id)"
          >x</span
        >
      </span>
    </div>
    <div class="vocabulary-list">
      <div
        v-for="word in filteredVocabularyList"
        :key="word.id"
        class="vocabulary-item"
        @click="word.id !== undefined && goToWordDetail(word.id)"
      >
        <h3>{{ word.writing }}</h3>
        <p>{{ word.chineseTranslation }}</p>
        <p class="created-at">
          {{ word.createdAt ? new Date(word.createdAt).toLocaleDateString() : 'N/A' }}
        </p>
        <div class="word-tags">
          <span v-for="tag in word.tags" :key="tag.id" class="tag-pill">{{ tag.name }}</span>
          <span v-if="!word.tags || word.tags.length === 0" class="tag-pill untagged">未分类</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>{{ selectedWord?.writing }}</h2>
      <p><strong>ID:</strong> {{ selectedWord?.id !== undefined ? selectedWord.id : 'N/A' }}</p>
      <p><strong>读法:</strong> {{ selectedWord?.reading }}</p>
      <p><strong>汉语翻译:</strong> {{ selectedWord?.chineseTranslation }}</p>
      <p>
        <strong>创建日期:</strong>
        {{
          selectedWord?.createdAt ? new Date(selectedWord.createdAt).toLocaleDateString() : 'N/A'
        }}
      </p>
      <p v-if="selectedWord?.pitch"><strong>声调:</strong> {{ selectedWord?.pitch }}</p>
      <p v-if="selectedWord?.partOfSpeech">
        <strong>词性:</strong> {{ selectedWord?.partOfSpeech }}
      </p>
      <p v-if="selectedWord?.example"><strong>例句:</strong> {{ selectedWord?.example }}</p>

      <p v-if="selectedWordTags.length > 0">
        <strong>标签:</strong>
        <span v-for="(tag, index) in selectedWordTags" :key="tag.id ?? index">
          {{ tag.name }}{{ index < selectedWordTags.length - 1 ? ', ' : '' }}
        </span>
      </p>
      <div class="modal-actions">
        <button @click="editWord">编辑</button>
        <button @click="deleteWord">删除</button>
        <button @click="closeDetailModal">关闭</button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="cancelEdit">
    <div class="modal-content">
      <h2>编辑单词</h2>
      <form @submit.prevent="saveEdit">
        <div class="form-group">
          <label for="edit-writing">书写法:</label>
          <input type="text" id="edit-writing" v-model="editedWord!.writing" required />
        </div>
        <div class="form-group">
          <label for="edit-reading">读法:</label>
          <input type="text" id="edit-reading" v-model="editedWord!.reading" required />
        </div>
        <div class="form-group">
          <label for="edit-chineseTranslation">汉语翻译:</label>
          <input
            type="text"
            id="edit-chineseTranslation"
            v-model="editedWord!.chineseTranslation"
            required
          />
        </div>
        <div class="form-group">
          <label for="edit-pitch">声调 (可选):</label>
          <input type="text" id="edit-pitch" v-model="editedWord!.pitch" />
        </div>
        <div class="form-group">
          <label for="edit-partOfSpeech">词性 (可选):</label>
          <input type="text" id="edit-partOfSpeech" v-model="editedWord!.partOfSpeech" />
        </div>
        <div class="form-group">
          <label for="edit-example">例句 (可选):</label>
          <textarea id="edit-example" v-model="editedWord!.example"></textarea>
        </div>

        <div class="form-group">
          <label for="edit-tags">标签 (可选):</label>
          <div class="form-group tags-section">
            <label>标签:</label>
            <div class="tag-container">
              <div
                v-for="tag in availableTags"
                :key="tag.id"
                class="tag-item"
                :class="{
                  'tag-selected':
                    editedWord!.tagIds &&
                    tag.id !== undefined &&
                    editedWord!.tagIds.includes(tag.id),
                }"
                @click="tag.id !== undefined && toggleTagSelection(tag.id)"
              >
                {{ tag.name }}
                <span
                  v-if="tag.id !== undefined"
                  class="delete-tag-button"
                  @click.stop="deleteTag(tag.id)"
                  >x</span
                >
              </div>
            </div>
            <div class="add-tag-container">
              <input type="text" v-model="newTagName" placeholder="新标签名称" class="tag-input" />
              <button type="button" @click="addNewTag" class="add-tag-button">+</button>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button type="submit">保存</button>
          <button type="button" @click="cancelEdit">取消</button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { db } from '@/services/db'
import type { Word, Tag } from '@/services/db'

interface WordWithTags extends Word {
  tags?: Tag[]
}

const vocabularyList = ref<WordWithTags[]>([])
const allTags = ref<Tag[]>([])
const filterTagId = ref<number | undefined>(undefined)

onMounted(async () => {
  await loadWords()
  await loadAllTags()
})

const loadWords = async () => {
  const words = await db.words.orderBy('createdAt').reverse().toArray()
  vocabularyList.value = await Promise.all(
    words.map(async (word) => {
      if (word.tagIds && word.tagIds.length > 0) {
        const tags = await db.tags.where('id').anyOf(word.tagIds).toArray()
        return { ...word, tags }
      }
      return word
    }),
  )
}

const loadAllTags = async () => {
  allTags.value = await db.tags.where('type').equals('vocabulary').toArray()
}

const filteredVocabularyList = computed(() => {
  if (!filterTagId.value) {
    return vocabularyList.value
  }
  return vocabularyList.value.filter((word) => {
    if (filterTagId.value === -1) {
      // -1 for "未分类"
      return !word.tagIds || word.tagIds.length === 0
    } else if (filterTagId.value !== undefined) {
      return word.tagIds && word.tagIds.includes(filterTagId.value)
    }
    return true // Should not happen if filterTagId.value is properly handled
  })
})

const showDetailModal = ref(false)
const selectedWord = ref<Word | null>(null)
const selectedWordTags = ref<Tag[]>([])

const showEditModal = ref(false)
const editedWord = ref<Word | null>(null)
const availableTags = ref<Tag[]>([])
const newTagName = ref('')

const deleteTag = async (tagId: number) => {
  const associatedWords = await db.words.where('tagIds').equals(tagId).toArray()

  if (associatedWords.length > 0) {
    const confirmDelete = confirm(
      '标签存在关联的单词，删除标签则清空所有关联单词的标签。确定删除吗？',
    )
    if (!confirmDelete) {
      return
    }

    // Clear tag from associated words
    for (const word of associatedWords) {
      if (word.tagIds) {
        word.tagIds = word.tagIds.filter((id) => id !== tagId)
        await db.words.put(word)
      }
    }
  }

  // Delete the tag itself
  await db.tags.delete(tagId)

  // Force reactive updates
  availableTags.value = availableTags.value.filter((tag) => tag.id !== tagId)

  await loadAllTags()
  await loadWords() // Reload words to reflect tag changes
}

const goToWordDetail = async (id: number) => {
  const foundWord = vocabularyList.value.find((word) => word.id === id) || null
  selectedWord.value = foundWord
  if (foundWord && foundWord.tagIds && foundWord.tagIds.length > 0) {
    selectedWordTags.value = await db.tags.where('id').anyOf(foundWord.tagIds).toArray()
  } else {
    selectedWordTags.value = []
  }
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedWord.value = null
  selectedWordTags.value = []
}

const editWord = async () => {
  if (selectedWord.value) {
    editedWord.value = { ...selectedWord.value } // Copy data for editing
    await loadTags()
    showEditModal.value = true
  }
}

const saveEdit = async () => {
  if (editedWord.value && editedWord.value.id !== undefined) {
    // Create a plain object with all necessary fields
    const wordToSave: Word = {
      id: editedWord.value.id !== undefined ? Number(editedWord.value.id) : undefined,
      writing: String(editedWord.value.writing),
      reading: editedWord.value.reading ? String(editedWord.value.reading) : '',
      chineseTranslation: editedWord.value.chineseTranslation
        ? String(editedWord.value.chineseTranslation)
        : '',
      createdAt: editedWord.value.createdAt ? new Date(editedWord.value.createdAt) : new Date(),
      tagIds: Array.isArray(editedWord.value.tagIds)
        ? editedWord.value.tagIds.map((id) => Number(id))
        : [],
      // Add any other necessary fields here
    }

    try {
      await db.words.put(wordToSave)
      showEditModal.value = false
      editedWord.value = null
      await loadWords() // Reload words after update
      await loadAllTags() // Reload all tags after word update
    } catch (error) {
      console.error('Error saving word:', error)
    }
  }
}

const cancelEdit = () => {
  showEditModal.value = false
  editedWord.value = null
}

const deleteWord = async () => {
  if (selectedWord.value && selectedWord.value.id !== undefined) {
    await db.words.delete(selectedWord.value.id)
    await loadWords() // Reload words after deletion
    closeDetailModal()
    console.log('删除单词', selectedWord.value)
  }
}

const loadTags = async () => {
  availableTags.value = await db.tags.where('type').equals('vocabulary').toArray()
}

const toggleTagSelection = (tagId: number) => {
  if (editedWord.value) {
    const index = editedWord.value.tagIds?.indexOf(tagId) ?? -1
    if (index > -1) {
      editedWord.value.tagIds?.splice(index, 1) // Remove tag
    } else {
      if (!editedWord.value.tagIds) {
        editedWord.value.tagIds = []
      }
      editedWord.value.tagIds.push(tagId) // Add tag
    }
  }
}

const addNewTag = async () => {
  if (newTagName.value.trim() === '') {
    alert('标签名称不能为空！')
    return
  }
  try {
    const existingTag = await db.tags
      .where('name')
      .equalsIgnoreCase(newTagName.value.trim())
      .first()
    if (existingTag) {
      alert('标签已存在！')
      return
    }
    const newTagId = await db.tags.add({
      name: newTagName.value.trim(),
      type: 'vocabulary',
      createdAt: new Date(),
    })
    const newTag: Tag = {
      id: newTagId,
      name: newTagName.value.trim(),
      type: 'vocabulary',
      createdAt: new Date(),
    }
    availableTags.value.push(newTag)
    if (editedWord.value) {
      editedWord.value.tagIds = editedWord.value.tagIds || []
      editedWord.value.tagIds.push(newTagId)
    }
    newTagName.value = ''
    await loadTags() // Reload tags after adding new one
    await loadAllTags() // Reload all tags to update filter list
  } catch (error: unknown) {
    console.error('添加标签失败:', error)
    alert('添加标签失败！')
  }
}
</script>

<style scoped>
.vocabulary-view {
  padding: 20px;
}
.tag-filter-container {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 20px;
}

.tag-filter-item {
  padding: 8px 15px;
  border: 1px solid #007bff;
  border-radius: 20px;
  cursor: pointer;
  background-color: #e7f3ff;
  color: #007bff;
  transition: all 0.3s ease;
}

.tag-filter-item:hover {
  background-color: #cce5ff;
}

.tag-filter-item.active {
  background-color: #007bff;
  color: white;
}

.filter-tag-delete-button {
  display: none;
  margin-left: 5px;
  color: #dc3545;
  font-weight: bold;
}

.tag-filter-item:hover .filter-tag-delete-button {
  display: inline;
}

.vocabulary-list {
  margin: 20px 0;
}

.word-tags {
  margin-top: 10px;
}

.tag-pill {
  display: inline-block;
  padding: 5px 10px;
  background-color: #f0f0f0;
  border-radius: 15px;
  font-size: 0.8em;
  margin-right: 5px;
  margin-bottom: 5px;
  color: #555;
}

.tag-pill.untagged {
  background-color: #ffcccc;
  color: #cc0000;
}
.vocabulary-item {
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  position: relative;
}

.vocabulary-item .created-at {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 12px;
  color: #666;
}
.vocabulary-item:hover {
  background-color: #f5f5f5;
}

/* Modal Styles */
.form-group {
  margin-bottom: 15px;
}

.tags-section {
  margin-bottom: 20px;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
  margin-bottom: 15px;
}

.tag-item {
  padding: 8px 15px;
  border: 1px solid #007bff;
  border-radius: 20px;
  cursor: pointer;
  background-color: #e7f3ff;
  color: #007bff;
  transition: all 0.3s ease;
}

.tag-item:hover {
  background-color: #cce5ff;
}

.tag-item.tag-selected {
  background-color: #ff69b4; /* Pink for selected tags */
  color: white;
  border-color: #ff69b4;
}

.add-tag-container {
  display: flex;
  gap: 10px;
  margin-top: 10px;
}

.tag-input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
}

.add-tag-button {
  padding: 8px 12px;
  background-color: #28a745;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.add-tag-button:hover {
  background-color: #218838;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
}

.form-group input[type='text'],
.form-group textarea {
  width: calc(100% - 20px); /* Adjust for padding */
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
}

.form-group textarea {
  min-height: 80px;
  resize: vertical;
}
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background-color: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  animation: slide-in 0.3s ease-out forwards;
}

.modal-content h2 {
  margin-top: 0;
  color: #007bff;
}

.modal-content p {
  margin-bottom: 10px;
}

.modal-actions {
  margin-top: 20px;
  text-align: right;
}

.modal-actions button {
  margin-left: 10px;
  padding: 8px 15px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  background-color: #007bff;
  color: white;
}

.modal-actions button:hover {
  background-color: #0056b3;
}

@keyframes slide-in {
  from {
    transform: translateY(-50px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}
</style>
