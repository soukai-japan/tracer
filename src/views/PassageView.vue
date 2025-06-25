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
        <p>原文: {{ passage.content }}</p>
        <p>翻译: {{ passage.translation }}</p>
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

  <!-- Detail Modal -->
  <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
    <div class="modal-content">
      <h2>{{ selectedPassage?.name }}</h2>
      <p><strong>作者:</strong> {{ selectedPassage?.author }}</p>

      <!-- 原文分析区域 -->
      <div class="passage-analysis">
        <div class="analysis-header">
          <h3>原文分析</h3>
          <button
            class="analyze-button"
            @click="analyzePassage(selectedPassage?.content || '')"
            :disabled="isAnalyzing"
          >
            {{ isAnalyzing ? '分析中...' : '开始分析' }}
          </button>
        </div>
        <div v-if="isAnalyzing" class="analyzing-indicator">
          <span>正在分析文章...</span>
        </div>
        <div v-else-if="analyzedTokens.length > 0" class="analyzed-content">
          <span
            v-for="(token, index) in analyzedTokens"
            :key="index"
            :class="['word-token', getPosColorClass(token.pos)]"
            @click="selectWord(token)"
          >
            {{ token.word }}
            <span class="furigana" v-if="token.furigana">{{ token.furigana }}</span>
          </span>
        </div>
        <div v-else class="original-content">
          <p>{{ selectedPassage?.content }}</p>
        </div>
      </div>

      <div v-if="selectedWord" class="word-detail-popup">
        <h3>{{ selectedWord.word }}</h3>
        <p v-if="selectedWord.furigana">假名: {{ selectedWord.furigana }}</p>
        <p v-if="selectedWord.romaji">罗马字: {{ selectedWord.romaji }}</p>
        <p v-if="selectedWord.pos">词性: {{ selectedWord.pos }}</p>
        <!-- Add more details if available in TokenData, e.g., meaning, base form -->
        <button class="close-button" @click="selectedWord = null">×</button>
      </div>

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
          <label for="edit-name">标题:</label>
          <input
            type="text"
            id="edit-name"
            :value="editedPassage?.name || ''"
            @input="
              (e) => editedPassage && (editedPassage.name = (e.target as HTMLInputElement).value)
            "
            required
          />
        </div>
        <div class="form-group">
          <label for="edit-author">作者:</label>
          <input
            type="text"
            id="edit-author"
            :value="editedPassage?.author || ''"
            @input="
              (e) => editedPassage && (editedPassage.author = (e.target as HTMLInputElement).value)
            "
          />
        </div>
        <div class="form-group">
          <label for="edit-content">内容:</label>
          <textarea
            id="edit-content"
            :value="editedPassage?.content || ''"
            @input="
              (e) =>
                editedPassage && (editedPassage.content = (e.target as HTMLTextAreaElement).value)
            "
            required
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
import { ref, onMounted, onUnmounted } from 'vue'
import { db } from '@/services/db'
import type { Passage as DbPassage } from '@/services/db'

interface TokenData {
  word: string
  pos: string
  furigana?: string
  romaji?: string
  base?: string
  meaning?: string
  conjugation_type?: string
  conjugated_form?: string
}

const passageList = ref<DbPassage[]>([]) // 改为直接存储文章数组
const currentPage = ref(1)
const pageSize = 10
const hasMorePassages = ref(true)
const isLoadingPassages = ref(false)

onMounted(async () => {
  await loadPassages()

  // 添加滚动监听
  window.addEventListener('scroll', handleScroll)
})

onUnmounted(() => {
  // 移除滚动监听
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

    if (newPassages.length < pageSize) {
      hasMorePassages.value = false
    }

    if (currentPage.value === 1) {
      passageList.value = newPassages
    } else {
      passageList.value = [...passageList.value, ...newPassages]
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
    // 距离底部100px时加载更多
    loadPassages()
  }
}

const showDetailModal = ref(false)
const selectedPassage = ref<DbPassage | null>(null)
const analyzedTokens = ref<TokenData[]>([])
const isAnalyzing = ref(false)
const selectedWord = ref<TokenData | null>(null)

const showEditModal = ref(false)
const editedPassage = ref<DbPassage | null>(null)

const goToPassageDetail = async (id: number) => {
  const foundPassage = passageList.value.find((passage) => passage.id === id) || null
  selectedPassage.value = foundPassage
  showDetailModal.value = true
  analyzedTokens.value = []
  selectedWord.value = null // Clear selected word when navigating to a new passage
}

const analyzePassage = async (text: string) => {
  if (!text) return
  isAnalyzing.value = true
  analyzedTokens.value = []

  try {
    const settings = await db.settings.get('ai_settings')
    const apiKey = settings?.siliconflowApiKey
    const selectedModel = settings?.selectedAiModel

    if (!apiKey || !selectedModel) {
      alert('请先在设置中配置SiliconFlow API Key和模型')
      isAnalyzing.value = false
      return
    }

    const sentences = text.match(/[^。！？]+[。！？]?/g) || []
    let allTokens: TokenData[] = []

    for (const sentence of sentences) {
      const prompt = `请对以下日语句子进行详细的词法分析，并以JSON数组格式返回结果。每个对象应包含以下字段："word", "pos", "furigana", "romaji"。

请特别注意以下分析要求：
1. 将助动词与对应动词正确结合。如"食べた"应作为一个单词，而不是分开为"食べ"和"た"。
2. 正确识别动词的时态变化，如"いた"是"いる"的过去时，应作为一个完整单词处理。
3. 合理处理助词，应当与前后词汇适当分离。
4. 避免过度分词，特别是对于构成一个语法或语义单位的组合。
5. 对于复合词，如"持って行く"，根据语义和使用习惯确定是作为一个词还是分开处理。

确保输出是严格的JSON格式，不包含任何markdown或其他非JSON字符。

待解析句子： "${sentence}"`

      const response = await fetch('https://api.siliconflow.cn/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.statusText}`)
      }

      const result = await response.json()
      let responseContent = result.choices[0].message.content

      try {
        const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/)
        if (jsonMatch && jsonMatch[1]) {
          responseContent = jsonMatch[1]
        }
        const parsedTokens = JSON.parse(responseContent)
        allTokens = allTokens.concat(parsedTokens)
      } catch (error) {
        console.error('解析分词结果失败:', error, responseContent)
      }
    }
    analyzedTokens.value = allTokens
  } catch (error) {
    console.error('分析文章失败:', error)
    alert('分析文章失败，请稍后重试')
  } finally {
    isAnalyzing.value = false
  }
}

const selectWord = (token: TokenData) => {
  selectedWord.value = token
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedPassage.value = null
  selectedWord.value = null // Clear selected word when closing modal
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

const getPosColorClass = (pos: string) => {
  if (pos.startsWith('名詞')) return 'pos-noun' // 名词
  if (pos.startsWith('動詞')) return 'pos-verb' // 动词
  if (pos.startsWith('形容詞')) return 'pos-adjective' // 形容词
  if (pos.startsWith('助詞')) return 'pos-particle' // 助词
  if (pos.startsWith('助動詞')) return 'pos-aux-verb' // 助动词
  if (pos.startsWith('副詞')) return 'pos-adverb' // 副词
  if (pos.startsWith('接続詞')) return 'pos-conjunction' // 连接词
  if (pos.startsWith('感動詞')) return 'pos-interjection' // 感动词
  if (pos.startsWith('連体詞')) return 'pos-adnominal' // 连体词
  if (pos.startsWith('接頭詞')) return 'pos-prefix' // 接头词
  if (pos.startsWith('接尾詞')) return 'pos-suffix' // 接尾词
  if (pos.startsWith('記号')) return 'pos-symbol' // 符号
  if (pos.startsWith('フィラー')) return 'pos-filler' // 填充词
  if (pos.startsWith('その他')) return 'pos-other' // 其他
  return 'pos-unknown' // 未知词性
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

.word-detail-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #f9f9f9; /* Slightly off-white background */
  border: 1px solid #e0e0e0; /* Lighter border */
  padding: 20px; /* Increased padding */
  z-index: 1000;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25); /* Stronger initial shadow */
  border-radius: 12px; /* More rounded corners */
  width: 90%;
  max-width: 700px; /* Slightly reduced max-width for a more compact look */
  height: auto;
  max-height: 75vh; /* Slightly increased max-height */
  overflow-y: auto;
  box-sizing: border-box;
  transition: all 0.3s ease-in-out; /* Smooth transition for all changes */
}

.word-detail-popup:hover {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35); /* More pronounced hover shadow */
}

.close-button {
  position: absolute;
  top: 8px; /* Adjusted position */
  right: 12px; /* Adjusted position */
  background: none;
  border: none;
  font-size: 18px; /* Further reduced font size for 'x' */
  cursor: pointer;
  color: #ff69b4; /* Pink color */
  font-weight: bold;
  padding: 0 5px;
  transition: color 0.2s ease; /* Smooth transition for color change */
}

.close-button:hover {
  color: #e05090; /* Darker pink on hover */
}

.word-detail-popup h3 {
  margin-top: 0;
  color: #333;
}

.word-detail-popup p {
  margin-bottom: 5px;
  color: #555;
}

.word-detail-popup button {
  margin-top: 5px;
  padding: 2px 6px;
  background-color: #ff69b4;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

.word-detail-popup button:hover {
  background-color: #f1116d;
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

.passage-analysis {
  margin: 20px 0;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.analysis-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 15px;
}

.analyze-button {
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.analyze-button:hover {
  background-color: #0056b3;
}

.analyze-button:disabled {
  background-color: #ccc;
  cursor: not-allowed;
}

.analyzing-indicator {
  text-align: center;
  padding: 20px;
  color: #666;
}

.original-content p {
  white-space: pre-wrap;
  line-height: 1.8;
  font-size: 1.1em;
  color: #333;
  padding: 10px;
  background-color: #fff;
  border-radius: 4px;
}

.analyzed-content {
  line-height: 2.5; /* 增加行高以避免下划线遮挡 */
  font-size: 1.1em;
}

.word-token {
  position: relative;
  display: inline-block;
  margin: 8px 2px;
  padding: 2px 4px;
  cursor: default;
  border-radius: 3px;
  transition: background-color 0.2s;
  padding-bottom: 0px; /* 增加下划线与文字的间距 */
  border-bottom: 2px solid transparent;
}

/* 词性颜色定义 */
.pos-noun {
  border-bottom-color: #007bff; /* 蓝色 - 名词 */
}

.pos-verb {
  border-bottom-color: #dc3545; /* 红色 - 动词 */
}

.pos-adjective {
  border-bottom-color: #28a745; /* 绿色 - 形容词 */
}

.pos-particle {
  border-bottom-color: #ffc107; /* 黄色 - 助词 */
}

.pos-aux-verb {
  border-bottom-color: #fd7e14; /* 橙色 - 助动词 */
}

.pos-adverb {
  border-bottom-color: #6f42c1; /* 紫色 - 副词 */
}

.pos-conjunction {
  border-bottom-color: #e83e8c; /* 粉色 - 接続詞 */
}

.pos-interjection {
  border-bottom-color: #20c997; /* 青绿色 - 感动词 */
}

.pos-adnominal {
  border-bottom-color: #17a2b8; /* 浅蓝色 - 连体词 */
}

.pos-prefix {
  border-bottom-color: #6610f2; /* 深紫色 - 接头词 */
}

.pos-suffix {
  border-bottom-color: #e83e8c; /* 粉色 - 接尾词 (与连接词相同，可调整) */
}

.pos-symbol {
  border-bottom-style: dotted;
  border-bottom-color: #6c757d; /* 灰色 - 记号 */
}

.pos-filler {
  border-bottom-color: #adb5bd; /* 浅灰色 - 填充词 */
}

.pos-other,
.pos-unknown {
  border-bottom-color: #343a40; /* 深灰色 - 其他/未知 */
}

.word-token:hover {
  background-color: #e9ecef;
}

.furigana {
  position: absolute;
  top: -1em;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.7em;
  color: #6c757d;
  white-space: nowrap;
}

.word-detail {
  margin: 20px 0;
  padding: 15px;
  background-color: #fff;
  border: 1px solid #dee2e6;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.word-detail h3 {
  color: #007bff;
  margin-bottom: 15px;
}

.word-detail-content p {
  margin-bottom: 8px;
  line-height: 1.6;
}

.word-detail-content .explanation {
  background-color: #f8f9fa;
  padding: 10px;
  border-radius: 4px;
  margin-top: 5px;
  font-size: 0.95em;
  line-height: 1.7;
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
