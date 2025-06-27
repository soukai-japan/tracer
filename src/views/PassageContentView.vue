<template>
  <div class="passage-content-view">
    <h1 v-if="passage">{{ passage.name }}</h1>
    <p v-if="passage" class="author">作者: {{ passage.author }}</p>

    <div v-if="passage" class="passage-analysis">
      <div class="original-content">
        <div class="passage-content-wrapper">
          <button @click="prevPage" :disabled="currentPage === 0" class="nav-button left-nav">
            <span class="triangle left"></span>
          </button>
          <div class="passage-segments" ref="passageSegmentsRef">
            <p
              v-for="(segment, index) in currentSegments"
              :key="'current-segment-' + index"
              class="passage-segment-item"
              @click="analyzePassageForSegment(index)"
            >
              <template v-if="analyzedSegmentData.has(index)">
                <span
                  v-for="(token, tokenIndex) in analyzedSegmentData.get(index)"
                  :key="'token-' + index + '-' + tokenIndex"
                  :class="['word-token', getPosColorClass(token.pos)]"
                  @click.stop="selectWord(token)"
                >
                  {{ token.word }}
                  <span class="furigana" v-if="token.furigana">{{ token.furigana }}</span>
                </span>
              </template>
              <template v-else-if="loadingSegments.get(index)">
                {{ segment }} <span class="loading-spinner"></span>
              </template>
              <template v-else>
                {{ segment }}
              </template>
            </p>
          </div>
          <button
            @click="nextPage"
            :disabled="currentPage >= totalPages - 1"
            class="nav-button right-nav"
          >
            <span class="triangle right"></span>
          </button>
        </div>
        <div class="page-indicator">
          <span>{{ currentPage + 1 }} / {{ totalPages }}</span>
        </div>
      </div>
    </div>

    <div v-if="selectedWord" class="word-detail-popup">
      <h3>{{ selectedWord.word }}</h3>
      <p v-if="selectedWord.furigana">假名: {{ selectedWord.furigana }}</p>
      <p v-if="selectedWord.romaji">罗马字: {{ selectedWord.romaji }}</p>
      <p v-if="selectedWord.pos">词性: {{ selectedWord.pos }}</p>
      <button class="close-button" @click="selectedWord = null">×</button>
    </div>

    <button @click="goBack">返回</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

interface DisplayPassage extends Omit<DbPassage, 'content' | 'translation'> {
  content: string
  translation: string
}

const route = useRoute()
const router = useRouter()
const passage = ref<DisplayPassage | null>(null)

const selectedWord = ref<TokenData | null>(null)
const currentPage = ref(0) // 当前页码，从0开始
const segmentsPerPage = 4 // 每页显示的段落数
const totalSegmentsCount = ref(0) // 文章总段落数
const currentSegments = ref<string[]>([]) // 当前页显示的段落

const loadPassageDetail = async (id: number) => {
  try {
    const dbPassage = await db.passages.get(id)
    if (dbPassage) {
      passage.value = {
        ...dbPassage,
        content: '', // 内容将通过分页加载填充
        translation: '', // 翻译内容已移除，但接口仍需要
      }
      totalSegmentsCount.value = await db.passageContents.where({ passageId: id }).count()
      await loadPageContent(id, currentPage.value)
    } else {
      passage.value = null
      console.warn(`Passage with ID ${id} not found in database.`)
    }
  } catch (error) {
    console.error('加载文章详情失败:', error)
    passage.value = null
  }
}

const loadPageContent = async (passageId: number, page: number) => {
  try {
    // 清空已分析的段落数据和加载状态
    analyzedSegmentData.value.clear()
    loadingSegments.value.clear()

    const offset = page * segmentsPerPage
    const segments = await db.passageContents
      .where({ passageId: passageId })
      .offset(offset)
      .limit(segmentsPerPage)
      .sortBy('segmentIndex')
    currentSegments.value = segments.map((s) => s.content)
  } catch (error) {
    console.error(`加载第 ${page} 页内容失败:`, error)
    currentSegments.value = []
  }
}

const passageId = ref<number | null>(null)

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      passageId.value = Number(newId)
      currentPage.value = 0 // Reset to first page on passage change
      await loadPassageDetail(passageId.value)
    }
  },
  { immediate: true },
)

const analyzedSegmentData = ref<Map<number, TokenData[]>>(new Map())
const loadingSegments = ref<Map<number, boolean>>(new Map())
const isAnalyzing = ref(false)

const analyzePassageForSegment = async (index: number) => {
  const segmentText = currentSegments.value[index]
  if (!segmentText) return

  loadingSegments.value.set(index, true) // 设置当前段落为加载中

  try {
    const tokens = await analyzePassage(segmentText)
    analyzedSegmentData.value.set(index, tokens)
  } catch (error) {
    console.error('分析段落失败:', error)
    // 可以选择在这里显示错误信息或保持原始文本
  } finally {
    loadingSegments.value.set(index, false) // 分析完成，移除加载状态
  }
}

const analyzePassage = async (segmentText: string): Promise<TokenData[]> => {
  const text = segmentText
  if (!text) return []

  try {
    const settings = await db.settings.get('ai_settings')
    const apiKey = settings?.siliconflowApiKey
    const selectedModel = settings?.selectedAiModel

    if (!apiKey || !selectedModel) {
      alert('请先在设置中配置SiliconFlow API Key和模型')
      isAnalyzing.value = false
      return []
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

      const data = await response.json()
      let responseContent = data.choices[0].message.content

      try {
        const jsonMatch = responseContent.match(/```json\n([\s\S]*?)\n```/)
        if (jsonMatch && jsonMatch[1]) {
          responseContent = jsonMatch[1]
        }
        const parsedTokens = JSON.parse(responseContent) as TokenData[]
        allTokens = allTokens.concat(parsedTokens)
      } catch (error) {
        console.error('解析分词结果失败:', error, responseContent)
      }
    }
    return allTokens
  } catch (error) {
    console.error('分析文章失败:', error)
    alert('分析文章失败，请稍后重试')
    return []
  }
}

const selectWord = (token: TokenData) => {
  selectedWord.value = token
}
const totalPages = computed(() => Math.ceil(totalSegmentsCount.value / segmentsPerPage))

const passageSegmentsRef = ref<HTMLElement | null>(null)

const prevPage = async () => {
  if (currentPage.value > 0) {
    if (passageSegmentsRef.value) {
      passageSegmentsRef.value.classList.add('animate-left')
      setTimeout(() => {
        if (passageSegmentsRef.value) {
          passageSegmentsRef.value.classList.remove('animate-left')
        }
      }, 500)
    }
    currentPage.value--
    if (passageId.value) {
      await loadPageContent(passageId.value, currentPage.value)
    }
  }
}

const nextPage = async () => {
  if (currentPage.value < totalPages.value - 1) {
    if (passageSegmentsRef.value) {
      passageSegmentsRef.value.classList.add('animate-right')
      setTimeout(() => {
        if (passageSegmentsRef.value) {
          passageSegmentsRef.value.classList.remove('animate-right')
        }
      }, 500)
    }
    currentPage.value++
    if (passageId.value) {
      await loadPageContent(passageId.value, currentPage.value)
    }
  }
}

const goBack = () => {
  router.back()
}

const getPosColorClass = (pos: string) => {
  if (pos.startsWith('名詞')) return 'pos-noun'
  if (pos.startsWith('動詞')) return 'pos-verb'
  if (pos.startsWith('形容詞')) return 'pos-adjective'
  if (pos.startsWith('助詞')) return 'pos-particle'
  if (pos.startsWith('助動詞')) return 'pos-aux-verb'
  if (pos.startsWith('副詞')) return 'pos-adverb'
  if (pos.startsWith('接続詞')) return 'pos-conjunction'
  if (pos.startsWith('感動詞')) return 'pos-interjection'
  if (pos.startsWith('連体詞')) return 'pos-adnominal'
  if (pos.startsWith('接頭詞')) return 'pos-prefix'
  if (pos.startsWith('接尾詞')) return 'pos-suffix'
  if (pos.startsWith('記号')) return 'pos-symbol'
  if (pos.startsWith('フィラー')) return 'pos-filler'
  if (pos.startsWith('その他')) return 'pos-other'
  return 'pos-unknown'
}
</script>

<style scoped>
.passage-content-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  height: 100vh; /* 固定高度为视口高度 */
  display: flex;
  flex-direction: column;
  justify-content: space-between; /* 使内容和按钮在垂直方向上分散 */
}

.original-content {
  flex-grow: 1; /* 让内容区域填充可用空间 */
  display: flex;
  flex-direction: column;
  justify-content: center; /* 垂直居中内容 */
  align-items: center; /* 水平居中内容 */
}

.passage-content-wrapper {
  display: flex;
  align-items: center; /* 垂直居中按钮和内容 */
  width: 100%;
  flex-grow: 1;
}

.passage-segments {
  flex-grow: 1;
  padding: 0 20px; /* 按钮和内容之间的间距 */
  text-align: justify;
  overflow-y: hidden; /* 移除滚动条 */
  height: 100%; /* 确保内容区域填充可用空间 */
}

.nav-button {
  background-color: transparent; /* 按钮背景透明 */
  border: none;
  cursor: pointer;
  font-size: 2em; /* 调整字体大小以适应三角形 */
  color: #007bff; /* 三角形颜色 */
  transition: color 0.2s;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 10px; /* 调整内边距 */
}

.nav-button:disabled {
  cursor: not-allowed;
}

.triangle {
  width: 0;
  height: 0;
  border-style: solid;
}

.triangle.left {
  border-width: 15px 20px 15px 0;
  border-color: transparent #007bff transparent transparent;
}

.triangle.right {
  border-width: 15px 0 15px 20px;
  border-color: transparent transparent transparent #007bff;
}

.nav-button:disabled .triangle.left {
  border-color: transparent #999999 transparent transparent;
}

.nav-button:disabled .triangle.right {
  border-color: transparent transparent transparent #999999;
}

.nav-button:disabled {
  cursor: not-allowed;
}

.left-nav {
  margin-right: auto; /* 将按钮推到最左边 */
}

.right-nav {
  margin-left: auto; /* 将按钮推到最右边 */
}

.page-indicator {
  text-align: center;
  margin-top: 10px;
  font-size: 1.1em;
  color: #555;
}

.passage-content-view h1 {
  color: #333;
  margin-bottom: 10px;
}

.passage-content-view .author {
  color: #666;
  font-style: italic;
  margin-bottom: 0px;
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
  background-color: transparent; /* 将背景色设置为透明 */
  border-radius: 4px;
}

.passage-segment-item {
  cursor: pointer;
  transition:
    box-shadow 0.3s ease,
    background-color 0.3s ease;
  background-color: #fff; /* 为每个段落项添加背景色 */
  margin-bottom: 10px; /* 增加段落之间的间距 */
  padding: 10px; /* 增加内边距 */
  border-radius: 4px;
}

.passage-segment-item:hover {
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15); /* 调整阴影效果 */
  background-color: #f0f0f0; /* 悬停时背景色变浅 */
}

.analyzed-content {
  line-height: 2.5;
  font-size: 1.1em;
}

.word-token {
  position: relative;
  display: inline-block;
  margin: 8px 2px;
  padding: 2px 8px;
  cursor: default;
  border-radius: 3px;
  transition: background-color 0.2s;
  padding-bottom: 0px;
  border-bottom: 2px solid transparent;
}

.furigana {
  display: block;
  font-size: 0.7em;
  color: #888;
  text-align: center;
  position: absolute;
  top: -1.2em;
  left: 0;
  right: 0;
}

@keyframes fadeInLeft {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

@keyframes fadeInRight {
  from {
    opacity: 0;
    transform: translateX(20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.passage-segments {
  flex-grow: 1;
  padding: 0 20px;
  text-align: justify;
  overflow-y: hidden;
  height: 100%;
}

.passage-segments.animate-left {
  animation: fadeInLeft 0.5s ease-in-out;
}

.passage-segments.animate-right {
  animation: fadeInRight 0.5s ease-in-out;
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
  border-bottom-color: #6c757d; /* 灰色 - 符号 */
}

.pos-filler {
  border-bottom-color: #adb5bd; /* 浅灰色 - 填充词 */
}

.pos-other {
  border-bottom-color: #343a40; /* 深色 - 其他 */
}

.pos-unknown {
  border-bottom-color: #f0ad4e; /* 橙色 - 未知 */
}

.word-detail-popup {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: #f9f9f9;
  border: 1px solid #e0e0e0;
  padding: 20px;
  z-index: 1000;
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.25);
  border-radius: 12px;
  width: 90%;
  max-width: 700px;
  height: auto;
  max-height: 75vh;
  overflow-y: auto;
  box-sizing: border-box;
  transition: all 0.3s ease-in-out;
}

.word-detail-popup:hover {
  box-shadow: 0 10px 20px rgba(0, 0, 0, 0.35);
}

.close-button {
  position: absolute;
  top: 8px;
  right: 12px;
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  color: #ff69b4;
  font-weight: bold;
  padding: 0 5px;
  transition: color 0.2s ease;
}

.close-button:hover {
  color: #e05090;
}

.loading-spinner {
  display: inline-block;
  width: 1em;
  height: 1em;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-radius: 50%;
  border-top-color: #007bff;
  animation: spin 1s ease-in-out infinite;
  -webkit-animation: spin 1s ease-in-out infinite;
  vertical-align: middle;
  margin-left: 0.5em;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
@-webkit-keyframes spin {
  to {
    -webkit-transform: rotate(360deg);
  }
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

.passage-translation {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 8px;
  white-space: pre-wrap;
  max-height: 300px;
  overflow-y: auto;
  border: 1px solid #eee;
}

button {
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #6c757d;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.2s;
}
</style>
