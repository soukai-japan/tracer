<script setup lang="ts">
import { ref, reactive } from 'vue'
import logo from '@/assets/logo.svg'
import { db } from '@/services/db'

const showAddModal = ref(false)
const addForm = reactive({
  type: '',
  word: '',
  meaning: '',
  pronunciation: '',
  wordExample: '',
  grammar: '',
  usage: '',
  grammarExample: '',
  passageName: '',
  author: '',
  source: '',
  content: '',
  translation: '',
})

const startQuickAdd = (type: string) => {
  addForm.type = type
  // Reset all fields
  addForm.word = ''
  addForm.meaning = ''
  addForm.pronunciation = ''
  addForm.wordExample = ''
  addForm.grammar = ''
  addForm.usage = ''
  addForm.grammarExample = ''
  addForm.passageName = ''
  addForm.author = ''
  addForm.source = ''
  addForm.content = ''
  addForm.translation = ''
  showAddModal.value = true
}

const addNewContent = async () => {
  try {
    if (addForm.type === 'word') {
      await db.words.add({
        word: addForm.word,
        meaning: addForm.meaning,
        pronunciation: addForm.pronunciation,
        example: addForm.wordExample,
        createdAt: new Date(),
      })
      console.log('Word added successfully!')
    } else if (addForm.type === 'grammar') {
      await db.grammars.add({
        grammar: addForm.grammar,
        meaning: addForm.meaning,
        usage: addForm.usage,
        example: addForm.grammarExample,
        createdAt: new Date(),
      })
      console.log('Grammar added successfully!')
    } else if (addForm.type === 'passage') {
      await db.passages.add({
        name: addForm.passageName,
        author: addForm.author,
        source: addForm.source,
        content: addForm.content,
        translation: addForm.translation,
        createdAt: new Date(),
      })
      console.log('Passage added successfully!')
    }
    showAddModal.value = false
  } catch (error) {
    console.error(`Error adding ${addForm.type}:`, error)
    alert(
      `添加${addForm.type === 'word' ? '单词' : addForm.type === 'grammar' ? '语法' : '文章'}失败！请检查控制台。`,
    )
  }
}

const closeModal = () => {
  showAddModal.value = false
}
</script>

<template>
  <div class="home-view">
    <img :src="logo" alt="Logo" class="app-logo" />
    <h1>Soukai Japan</h1>
    <div class="quick-add-section">
      <h2>快速添加</h2>
      <div class="quick-add-buttons">
        <button @click="startQuickAdd('word')">添加单词</button>
        <button @click="startQuickAdd('grammar')">添加语法</button>
        <button @click="startQuickAdd('passage')">添加文章</button>
      </div>
    </div>

    <div v-if="showAddModal" class="modal-overlay">
      <div class="modal-content">
        <h3>
          添加新{{
            addForm.type === 'word' ? '单词' : addForm.type === 'grammar' ? '语法' : '文章'
          }}
        </h3>
        <form @submit.prevent="addNewContent">
          <template v-if="addForm.type === 'word'">
            <div class="form-group">
              <label for="word">单词:</label>
              <input type="text" id="word" v-model="addForm.word" required />
            </div>
            <div class="form-group">
              <label for="meaning">含义:</label>
              <input type="text" id="meaning" v-model="addForm.meaning" required />
            </div>
            <div class="form-group">
              <label for="pronunciation">发音:</label>
              <input type="text" id="pronunciation" v-model="addForm.pronunciation" />
            </div>
            <div class="form-group">
              <label for="wordExample">例句 (可选):</label>
              <textarea id="wordExample" v-model="addForm.wordExample" rows="3"></textarea>
            </div>
          </template>

          <template v-else-if="addForm.type === 'grammar'">
            <div class="form-group">
              <label for="grammar">语法:</label>
              <input type="text" id="grammar" v-model="addForm.grammar" required />
            </div>
            <div class="form-group">
              <label for="meaning">含义:</label>
              <input type="text" id="meaning" v-model="addForm.meaning" required />
            </div>
            <div class="form-group">
              <label for="usage">用法:</label>
              <textarea id="usage" v-model="addForm.usage" rows="3" required></textarea>
            </div>
            <div class="form-group">
              <label for="grammarExample">例句 (可选):</label>
              <textarea id="grammarExample" v-model="addForm.grammarExample" rows="3"></textarea>
            </div>
          </template>

          <template v-else-if="addForm.type === 'passage'">
            <div class="form-group">
              <label for="passageName">文章名称:</label>
              <input type="text" id="passageName" v-model="addForm.passageName" required />
            </div>
            <div class="form-group">
              <label for="author">作者 (可选):</label>
              <input type="text" id="author" v-model="addForm.author" />
            </div>
            <div class="form-group">
              <label for="source">来源 (可选):</label>
              <input type="text" id="source" v-model="addForm.source" />
            </div>
            <div class="form-group">
              <label for="content">内容:</label>
              <textarea id="content" v-model="addForm.content" rows="5" required></textarea>
            </div>
            <div class="form-group">
              <label for="translation">翻译:</label>
              <textarea id="translation" v-model="addForm.translation" rows="5" required></textarea>
            </div>
          </template>
          <div class="modal-actions">
            <button type="submit" class="submit-button">添加</button>
            <button type="button" @click="closeModal" class="cancel-button">取消</button>
          </div>
        </form>
      </div>
    </div>

    <footer class="app-footer">
      <p>这是一个帮助您学习日语的Web应用。</p>
      <RouterLink to="/about">关于我们</RouterLink>
    </footer>
  </div>
</template>

<style scoped>
.home-view {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: calc(100vh - 60px); /* 假设导航栏高度为60px */
  padding: 20px;
  text-align: center;
}

.app-logo {
  width: 150px; /* 调整logo大小 */
  height: auto;
  margin-bottom: 20px;
}

h1 {
  font-size: 2.5em;
  margin-bottom: 40px;
  color: #333;
}

.quick-add-section {
  margin-top: 40px;
  margin-bottom: 50px;
  text-align: center;
}

.quick-add-section h2 {
  font-size: 2em;
  color: #333;
  margin-bottom: 20px;
}

.quick-add-buttons {
  display: flex;
  gap: 20px;
  justify-content: center;
}

.quick-add-buttons button {
  padding: 15px 30px;
  font-size: 1.2em;
  color: white;
  background-color: #28a745; /* Green for add buttons */
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.quick-add-buttons button:hover {
  background-color: #218838;
}

button {
  padding: 15px 30px;
  font-size: 1.2em;
  color: white;
  background-color: #007bff;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.3s ease;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

button:hover {
  background-color: #0056b3;
}

.app-footer {
  margin-top: auto; /* 将footer推到底部 */
  padding-top: 20px;
  border-top: 1px solid #eee;
  width: 100%;
  color: #666;
}

.app-footer p {
  margin-bottom: 10px;
}

.app-footer a {
  color: #007bff;
  text-decoration: none;
}

.app-footer a:hover {
  text-decoration: underline;
}

/* Modal Styles */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  padding: 30px;
  border-radius: 10px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
  width: 90%;
  max-width: 500px;
  animation: fadeInScale 0.3s ease-out;
}

.modal-content h3 {
  margin-top: 0;
  font-size: 1.8em;
  color: #333;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
  text-align: left;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input[type='text'],
.form-group textarea {
  width: calc(100% - 20px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 1em;
}

.form-group textarea {
  resize: vertical;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 20px;
}

.submit-button,
.cancel-button {
  padding: 10px 20px;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.3s ease;
}

.submit-button {
  background-color: #007bff;
  color: white;
}

.submit-button:hover {
  background-color: #0056b3;
}

.cancel-button {
  background-color: #6c757d;
  color: white;
}

.cancel-button:hover {
  background-color: #5a6268;
}

@keyframes fadeInScale {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
</style>
