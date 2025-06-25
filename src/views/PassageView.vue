<template>
  <div class="passage-view">
    <h1>日语文章段落学习</h1>
    <div class="passage-list">
      <div
        v-for="passage in passageList"
        :key="passage.id"
        class="passage-item"
        @click="goToPassageDetail(passage.id)"
      >
        <h3 v-if="isURL(passage.source)">
          <a :href="passage.source" target="_blank" rel="noopener noreferrer" @click.stop>{{
            passage.name
          }}</a>
        </h3>
        <h3 v-else>{{ passage.name }}</h3>
        <p>原文: {{ passage.content }}</p>
        <p>翻译: {{ passage.translation }}</p>
        <p class="created-at">{{ new Date(passage.createdAt).toLocaleDateString() }}</p>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>{{ selectedPassage?.name }}</h2>
      <p><strong>作者:</strong> {{ selectedPassage?.author }}</p>
      <p class="passage-content"><strong>原文:</strong> {{ selectedPassage?.content }}</p>
      <p class="passage-content"><strong>翻译:</strong> {{ selectedPassage?.translation }}</p>
      <div class="modal-actions">
        <button @click="editPassage">编辑</button>
        <button @click="deletePassage">删除</button>
        <button @click="closeDetailModal">关闭</button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="cancelEdit">
    <div class="modal-content">
      <h2>编辑文章</h2>
      <form @submit.prevent="saveEdit">
        <div class="form-group">
          <label for="edit-title">标题:</label>
          <input type="text" id="edit-title" v-model="editedPassage.title" required />
        </div>
        <div class="form-group">
          <label for="edit-author">作者:</label>
          <input type="text" id="edit-author" v-model="editedPassage.author" />
        </div>
        <div class="form-group">
          <label for="edit-content">内容:</label>
          <textarea id="edit-content" v-model="editedPassage.content" required></textarea>
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
import { db, Passage as DbPassage } from '@/services/db'

const passageList = ref<DbPassage[]>([]) // 改为直接存储文章数组

onMounted(async () => {
  await loadPassages()
})

const loadPassages = async () => {
  passageList.value = await db.passages.orderBy('createdAt').reverse().toArray() // 直接获取文章数组
}

const showDetailModal = ref(false)
const selectedPassage = ref<DbPassage | null>(null)

const showEditModal = ref(false)
const editedPassage = ref<DbPassage | null>(null)

const goToPassageDetail = (id: number) => {
  const foundPassage = passageList.value.find((passage) => passage.id === id) || null
  selectedPassage.value = foundPassage
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedPassage.value = null
}

const editPassage = () => {
  if (selectedPassage.value) {
    editedPassage.value = { ...selectedPassage.value } // Copy data for editing
    showEditModal.value = true
  }
}

const saveEdit = async () => {
  if (editedPassage.value && editedPassage.value.id !== undefined) {
    await db.passages.put({
      ...editedPassage.value,
      createdAt: editedPassage.value.createdAt || new Date(), // 如果没有 createdAt，则设置为当前时间
    })
    await loadPassages() // Reload passages after update
    showEditModal.value = false
    closeDetailModal() // Close detail modal after editing
  }
}

const cancelEdit = () => {
  showEditModal.value = false
  editedPassage.value = null
}

const deletePassage = async () => {
  if (selectedPassage.value && selectedPassage.value.id !== undefined) {
    await db.passages.delete(selectedPassage.value.id)
    await loadPassages() // Reload passages after deletion
    closeDetailModal()
    console.log('删除文章', selectedPassage.value)
  }
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

/* Modal Styles (reused from VocabularyView, consider a common CSS file for modals) */
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
  max-width: 600px; /* 文章内容可能较多，适当增加宽度 */
  animation: slide-in 0.3s ease-out forwards;
}

.modal-content h2 {
  margin-top: 0;
  color: #007bff;
}

.modal-content p {
  margin-bottom: 10px;
}

.passage-content {
  white-space: pre-wrap; /* 保留文章内容的换行和空格 */
  max-height: 300px; /* 限制文章内容高度，出现滚动条 */
  overflow-y: auto;
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 5px;
  background-color: #f9f9f9;
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
