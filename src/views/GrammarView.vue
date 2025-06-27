<template>
  <div class="grammar-view">
    <h1>日语语法学习</h1>
    <div class="grammar-list">
      <div
        v-for="grammar in grammarList"
        :key="grammar.id"
        class="grammar-item"
        @click="grammar.id ? goToGrammarDetail(grammar.id) : null"
      >
        <h3>原文: {{ grammar.grammar }}</h3>
        <p>含义: {{ grammar.meaning }}</p>
        <p class="created-at">
          {{ grammar.createdAt ? new Date(grammar.createdAt).toLocaleDateString() : '' }}
        </p>
      </div>
    </div>
  </div>

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>原文: {{ selectedGrammar?.grammar }}</h2>
      <p><strong>含义:</strong> {{ selectedGrammar?.meaning }}</p>
      <p v-if="selectedGrammar?.usage"><strong>用法:</strong> {{ selectedGrammar?.usage }}</p>
      <div v-if="selectedGrammar?.example && typeof selectedGrammar.example === 'string'">
        <strong>例句:</strong>
        <ul>
          <li v-for="(example, index) in (selectedGrammar.example || '').split('\n')" :key="index">
            {{ example }}
          </li>
        </ul>
      </div>
      <div class="modal-actions">
        <button @click="editGrammar">编辑</button>
        <button @click="deleteGrammar">删除</button>
        <button @click="closeDetailModal">关闭</button>
      </div>
    </div>
  </div>

  <!-- Edit Modal -->
  <div v-if="showEditModal" class="modal-overlay" @click.self="cancelEdit">
    <div v-if="editedGrammar" class="modal-content">
      <h2>编辑语法</h2>
      <form @submit.prevent="saveEdit">
        <div class="form-group">
          <label for="edit-pattern">语法模式:</label>
          <input type="text" id="edit-pattern" v-model="editedGrammar.grammar" required />
        </div>
        <div class="form-group">
          <label for="edit-meaning">含义:</label>
          <input type="text" id="edit-meaning" v-model="editedGrammar.meaning" required />
        </div>
        <div class="form-group">
          <label for="edit-usage">用法:</label>
          <textarea id="edit-usage" v-model="editedGrammar.usage"></textarea>
        </div>
        <div class="form-group">
          <label for="edit-examples">例句 (每行一个):</label>
          <textarea
            id="edit-examples"
            v-model="editedGrammar.example"
            @input="
              (e) =>
                editedGrammar && (editedGrammar.example = (e.target as HTMLTextAreaElement).value)
            "
          ></textarea>
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
import type { Grammar as DbGrammar } from '@/services/db'
import { db } from '@/services/db'

const grammarList = ref<DbGrammar[]>([]) // 改为直接存储语法数组

onMounted(async () => {
  await loadGrammars()
})

const loadGrammars = async () => {
  grammarList.value = await db.grammars.orderBy('createdAt').reverse().toArray() // 直接获取语法数组
}

const showDetailModal = ref(false)
const selectedGrammar = ref<DbGrammar | null>(null)

const showEditModal = ref(false)
const editedGrammar = ref<DbGrammar | null>(null)

const goToGrammarDetail = (id: number) => {
  const foundGrammar = grammarList.value.find((grammar) => grammar.id === id) || null
  selectedGrammar.value = foundGrammar
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedGrammar.value = null
}

const editGrammar = () => {
  if (selectedGrammar.value) {
    editedGrammar.value = { ...selectedGrammar.value } // Copy data for editing
    showEditModal.value = true
  }
}

const saveEdit = async () => {
  if (editedGrammar.value && editedGrammar.value.id !== undefined) {
    await db.grammars.put({
      ...editedGrammar.value,
      createdAt: editedGrammar.value.createdAt || new Date(), // 如果没有 createdAt，则设置为当前时间
    })
    await loadGrammars() // Reload grammars after update
    showEditModal.value = false
    closeDetailModal() // Close detail modal after editing
  }
}

const cancelEdit = () => {
  showEditModal.value = false
  editedGrammar.value = null
}

const deleteGrammar = async () => {
  if (selectedGrammar.value && selectedGrammar.value.id !== undefined) {
    await db.grammars.delete(selectedGrammar.value.id)
    await loadGrammars() // Reload grammars after deletion
    closeDetailModal()
    console.log('删除语法', selectedGrammar.value)
  }
}
</script>

<style scoped>
.grammar-view {
  padding: 20px;
}
.grammar-list {
  margin: 20px 0;
}
.grammar-item {
  padding: 10px;
  margin: 10px 0;
  border: 1px solid #ddd;
  border-radius: 5px;
  cursor: pointer;
  position: relative;
}

.grammar-item .created-at {
  position: absolute;
  bottom: 5px;
  right: 10px;
  font-size: 12px;
  color: #666;
}
.grammar-item:hover {
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
