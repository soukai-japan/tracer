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
        <h3>{{ word.word }}</h3>
        <p>{{ word.meaning }}</p>
        <p class="created-at">{{ new Date(word.createdAt).toLocaleDateString() }}</p>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>{{ selectedWord?.japanese }}</h2>
      <p><strong>含义:</strong> {{ selectedWord?.meaning }}</p>
      <p v-if="selectedWord?.pronunciation">
        <strong>发音:</strong> {{ selectedWord?.pronunciation }}
      </p>
      <p v-if="selectedWord?.example"><strong>例句:</strong> {{ selectedWord?.example }}</p>
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
          <label for="edit-japanese">日语:</label>
          <input type="text" id="edit-japanese" v-model="editedWord.japanese" required />
        </div>
        <div class="form-group">
          <label for="edit-meaning">含义:</label>
          <input type="text" id="edit-meaning" v-model="editedWord.meaning" required />
        </div>
        <div class="form-group">
          <label for="edit-pronunciation">发音:</label>
          <input type="text" id="edit-pronunciation" v-model="editedWord.pronunciation" />
        </div>
        <div class="form-group">
          <label for="edit-example">例句:</label>
          <textarea id="edit-example" v-model="editedWord.example"></textarea>
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
import { db, Word } from '@/services/db'

const vocabularyList = ref<DbWord[]>([]) // 改为直接存储单词数组

onMounted(async () => {
  await loadWords()
})

const loadWords = async () => {
  vocabularyList.value = await db.words.orderBy('createdAt').reverse().toArray() // 直接获取单词数组
}

const showDetailModal = ref(false)
const selectedWord = ref<Word | null>(null)

const showEditModal = ref(false)
const editedWord = ref<Word | null>(null)

const goToWordDetail = (id: number) => {
  const foundWord = vocabularyList.value.find((word) => word.id === id) || null
  selectedWord.value = foundWord
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedWord.value = null
}

const editWord = () => {
  if (selectedWord.value) {
    editedWord.value = { ...selectedWord.value } // Copy data for editing
    showEditModal.value = true
  }
}

const saveEdit = async () => {
  if (editedWord.value && editedWord.value.id !== undefined) {
    await db.words.put({
      ...editedWord.value,
      createdAt: editedWord.value.createdAt || new Date(), // 如果没有 createdAt，则设置为当前时间
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
