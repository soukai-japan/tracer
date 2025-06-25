<template>
  <div class="vocabulary-view">
    <h1>日语单词学习</h1>
    <div class="vocabulary-list">
      <div
        v-for="word in vocabularyList"
        :key="word.id"
        class="vocabulary-item"
        @click="goToWordDetail(word.id)"
      >
        <h3>{{ word.writing }}</h3>
        <p>{{ word.chineseTranslation }}</p>
        <p class="created-at">{{ new Date(word.createdAt).toLocaleDateString() }}</p>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>{{ selectedWord?.writing }}</h2>
      <p><strong>ID:</strong> {{ selectedWord?.id ?? 'N/A' }}</p>
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
          <select id="edit-tags" v-model="editedWord!.tagIds" multiple>
            <option v-for="tag in availableTags" :key="tag.id" :value="tag.id">
              {{ tag.name }}
            </option>
          </select>
          <div class="add-tag-container">
            <input type="text" v-model="newTagName" placeholder="新标签名称" />
            <button type="button" @click="addNewTag">添加标签</button>
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
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'
import type { Word, Tag } from '@/services/db'

const vocabularyList = ref<Word[]>([])

onMounted(async () => {
  await loadWords()
})

const loadWords = async () => {
  vocabularyList.value = await db.words.orderBy('createdAt').reverse().toArray() // 直接获取单词数组
}

const showDetailModal = ref(false)
const selectedWord = ref<Word | null>(null)
const selectedWordTags = ref<Tag[]>([])

const showEditModal = ref(false)
const editedWord = ref<Word | null>(null)
const availableTags = ref<Tag[]>([])
const newTagName = ref('')

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
    await db.words.put({
      ...editedWord.value,
      createdAt: editedWord.value.createdAt || new Date(),
      tagIds: editedWord.value.tagIds || [],
    })
    showEditModal.value = false
    editedWord.value = null
    await loadWords() // Reload words after update
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
.vocabulary-list {
  margin: 20px 0;
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
