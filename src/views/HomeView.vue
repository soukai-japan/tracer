<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import logo from '@/assets/logo.svg'
import { db } from '@/services/db'
import type { Tag } from '@/services/db'

const showAddModal = ref(false)
const isLoading = ref(false)
const addForm = reactive({
  type: '',
  writing: '', // 书写法
  pitch: '', // 声调
  partOfSpeech: '', // 词性
  reading: '', // 读法
  chineseTranslation: '', // 汉语翻译
  example: '', // 例句
  selectedTagIds: [] as number[], // 选中的标签ID
  grammar: '',
  usage: '',
  grammarExample: '',
  passageName: '',
  author: '',
  source: '',
  content: '',
  translation: '',
  grammarMeaning: '', // 新增的语法含义字段
})

const parseWordWithAI = async (writing: string) => {
  try {
    isLoading.value = true
    const settings = await db.settings.get('ai_settings')
    const apiKey = settings?.siliconflowApiKey
    const selectedModel = settings?.selectedAiModel
    if (!apiKey) {
      alert('请先在设置中配置SiliconFlow API Key')
      return
    }
    if (!selectedModel) {
      alert('请先在设置中配置SiliconFlow 模型')
      return
    }

    const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: selectedModel, // 使用用户选择的模型
        messages: [
          {
            role: 'user',
            content: `请解析日语单词 "${writing}" 的书写法、声调、词性、读法、汉语翻译和例句。请以JSON格式返回，包含 'writing', 'pitch', 'partOfSpeech', 'reading', 'chineseTranslation', 'example' 字段。例如: {"writing": "${writing}", "pitch": "声调", "partOfSpeech": "词性", "reading": "读法", "chineseTranslation": "汉语翻译", "example": "例句"}`,
          },
        ],
        temperature: 0.7,
      }),
    })

    if (!response.ok) throw new Error('API请求失败')

    const result = await response.json()
    let aiContent = result.choices[0].message.content

    // 尝试从字符串中提取JSON部分
    const jsonMatch = aiContent.match(/```json\n([\s\S]*?)\n```/)
    if (jsonMatch && jsonMatch[1]) {
      aiContent = jsonMatch[1]
    }

    try {
      const parsedData = JSON.parse(aiContent)
      addForm.writing = parsedData.writing || ''
      addForm.pitch = parsedData.pitch || ''
      addForm.partOfSpeech = parsedData.partOfSpeech || ''
      addForm.reading = parsedData.reading || ''
      addForm.chineseTranslation = parsedData.chineseTranslation || ''
      addForm.example = parsedData.example || ''
    } catch (error: unknown) {
      console.warn('AI返回内容不是有效的JSON，尝试进行文本解析:', aiContent)
      console.error(error)
      // Fallback to simple text parsing if AI doesn't return JSON
      const writingMatch = aiContent.match(/书写法: (.+)/)
      const pitchMatch = aiContent.match(/声调: (.+)/)
      const partOfSpeechMatch = aiContent.match(/词性: (.+)/)
      const readingMatch = aiContent.match(/读法: (.+)/)
      const chineseTranslationMatch = aiContent.match(/汉语翻译: (.+)/)
      const exampleMatch = aiContent.match(/例句: (.+)/)

      addForm.writing = writingMatch ? writingMatch[1].trim() : aiContent
      addForm.pitch = pitchMatch ? pitchMatch[1].trim() : ''
      addForm.partOfSpeech = partOfSpeechMatch ? partOfSpeechMatch[1].trim() : ''
      addForm.reading = readingMatch ? readingMatch[1].trim() : ''
      addForm.chineseTranslation = chineseTranslationMatch ? chineseTranslationMatch[1].trim() : ''
      addForm.example = exampleMatch ? exampleMatch[1].trim() : ''
    }
  } catch (error: unknown) {
    console.error('AI解析单词失败:', error)
    alert('AI解析单词失败，请检查控制台或稍后重试')
  } finally {
    isLoading.value = false
  }
}

const startQuickAdd = (type: string) => {
  addForm.type = type
  // Reset all fields
  addForm.writing = ''
  addForm.pitch = ''
  addForm.partOfSpeech = ''
  addForm.reading = ''
  addForm.chineseTranslation = ''
  addForm.example = ''
  addForm.grammar = ''
  addForm.usage = ''
  addForm.grammarExample = ''
  addForm.passageName = ''
  addForm.author = ''
  addForm.source = ''
  addForm.content = ''
  addForm.translation = ''
  addForm.selectedTagIds = [] // Reset selected tags
  showAddModal.value = true
}

const showOptionalSection = ref(false)

const toggleOptionalSection = () => {
  showOptionalSection.value = !showOptionalSection.value
}

const addNewContent = async () => {
  try {
    if (addForm.type === 'word') {
      await db.words.add({
        writing: addForm.writing,
        pitch: addForm.pitch,
        partOfSpeech: addForm.partOfSpeech,
        reading: addForm.reading,
        chineseTranslation: addForm.chineseTranslation,
        example: addForm.example,
        tagIds: Array.from(addForm.selectedTagIds),
        createdAt: new Date(),
      })
      console.log('Word added successfully!')
    } else if (addForm.type === 'grammar') {
      await db.grammars.add({
        grammar: addForm.grammar,
        meaning: addForm.grammarMeaning,
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
  } catch (error: unknown) {
    console.error(`Error adding ${addForm.type}:`, error)

    if (error instanceof Error && error.name === 'ConstraintError') {
      alert(
        `添加失败：${addForm.type === 'word' ? '单词' : '语法'} "${addForm.type === 'word' ? addForm.writing : addForm.grammar}" 已存在！`,
      )
    } else {
      alert(
        `添加${addForm.type === 'word' ? '单词' : addForm.type === 'grammar' ? '语法' : '文章'}失败！请检查控制台。`,
      )
    }
  }
}

const toggleTagSelection = (tagId: number) => {
  const index = addForm.selectedTagIds.indexOf(tagId)
  if (index > -1) {
    addForm.selectedTagIds.splice(index, 1) // Remove tag
  } else {
    addForm.selectedTagIds.push(tagId) // Add tag
  }
}

const closeModal = () => {
  showAddModal.value = false
}

const newTagName = ref('')
const availableTags = ref<Tag[]>([])

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
    await db.tags.add({
      name: newTagName.value.trim(),
      type: 'vocabulary',
      createdAt: new Date(),
    })
    newTagName.value = ''
    await loadTags() // Reload tags after adding new one
  } catch (error: unknown) {
    console.error('添加标签失败:', error)
    alert('添加标签失败！')
  }
}

onMounted(() => {
  loadTags()
})
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
              <label for="writing">书写法:</label>
              <div class="word-input-container">
                <input type="text" id="writing" v-model="addForm.writing" required />
                <button
                  type="button"
                  @click="parseWordWithAI(addForm.writing)"
                  :disabled="!addForm.writing || isLoading"
                  class="ai-parse-button"
                >
                  {{ isLoading ? '解析中...' : 'AI解析' }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="reading">读法:</label>
              <input type="text" id="reading" v-model="addForm.reading" required />
            </div>
            <div class="form-group">
              <label for="chineseTranslation">汉语翻译:</label>
              <input
                type="text"
                id="chineseTranslation"
                v-model="addForm.chineseTranslation"
                required
              />
            </div>
            <div class="form-group">
              <div class="optional-section" @click="toggleOptionalSection">
                <h4>
                  可选信息 <span class="toggle-icon">{{ showOptionalSection ? '▼' : '▶' }}</span>
                </h4>
              </div>
              <div v-if="showOptionalSection" class="optional-fields">
                <div class="form-group">
                  <label for="pitch">声调:</label>
                  <input type="text" id="pitch" v-model="addForm.pitch" />
                </div>
                <div class="form-group">
                  <label for="partOfSpeech">词性:</label>
                  <input type="text" id="partOfSpeech" v-model="addForm.partOfSpeech" />
                </div>
                <div class="form-group">
                  <label for="example">例句:</label>
                  <textarea id="example" v-model="addForm.example" rows="3"></textarea>
                </div>
                <div class="form-group tags-section">
                  <label>标签:</label>
                  <div class="tag-container">
                    <div
                      v-for="tag in availableTags"
                      :key="tag.id"
                      class="tag-item"
                      :class="{ 'tag-selected': addForm.selectedTagIds.includes(tag.id) }"
                      @click="toggleTagSelection(tag.id)"
                    >
                      {{ tag.name }}
                    </div>
                  </div>
                  <div class="add-tag-container">
                    <input
                      type="text"
                      v-model="newTagName"
                      placeholder="新标签名称"
                      class="tag-input"
                    />
                    <button type="button" @click="addNewTag" class="add-tag-button">+</button>
                  </div>
                </div>
              </div>
            </div>
          </template>

          <template v-else-if="addForm.type === 'grammar'">
            <div class="form-group">
              <label for="grammar">语法:</label>
              <input type="text" id="grammar" v-model="addForm.grammar" required />
            </div>
            <div class="form-group">
              <label for="meaning">含义:</label>
              <input type="text" id="grammar-meaning" v-model="addForm.grammarMeaning" required />
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
  max-width: 600px; /* 调整最大宽度 */
  max-height: 80vh; /* 设置最大高度为视口高度的80% */
  overflow-y: auto; /* 当内容超出时显示垂直滚动条 */
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

.word-input-container {
  display: flex;
  gap: 10px;
}

.word-input-container input {
  flex-grow: 1;
}

.ai-parse-button {
  padding: 10px 15px;
  background-color: #4caf50;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 1em;
  transition: background-color 0.2s ease;
}

.ai-parse-button:hover:not(:disabled) {
  background-color: #45a049;
}

.ai-parse-button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
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

.optional-section {
  cursor: pointer;
  margin: 15px 0;
  padding: 10px;
  background-color: #f5f5f5;
  border-radius: 5px;
}

.optional-section h4 {
  margin: 0;
  display: flex;
  align-items: center;
}

.toggle-icon {
  margin-left: 10px;
}

.optional-fields {
  padding: 10px;
  background-color: #f9f9f9;
  border-radius: 5px;
  margin-bottom: 15px;
}

.tags-section {
  margin-top: 15px;
  margin-bottom: 20px; /* 为标签部分添加底部间距 */
}

.tag-selector {
  width: 100%;
  min-height: 100px;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 5px;
  margin-bottom: 10px;
}

.add-tag-container {
  display: flex;
  gap: 10px;
}

.tag-input {
  flex: 1;
  padding: 8px 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.add-tag-button {
  padding: 0 15px;
  background-color: #fb7299;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.add-tag-button:hover {
  background-color: #218838;
}

.tag-label {
  padding: 6px 12px;
  background-color: #f1f1f1;
  border-radius: 15px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid #e0e0e0;
  color: #555;
  white-space: nowrap; /* Prevent text wrapping inside the tag */
}

.tag-selected {
  background-color: #fb7299;
  color: white;
  border-color: #fb7299;
}

.tag-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-item {
  padding: 6px 12px;
  background-color: #f0f0f0;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: 1px solid #ddd;
}

.tag-item:hover {
  background-color: #e0e0e0;
}

.tag-selected {
  background-color: #ff85c0;
  color: white;
  border-color: #ff85c0;
}
</style>
