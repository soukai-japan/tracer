<template>
  <div class="passage-content-view">
    <h1 v-if="passage">{{ passage.name }}</h1>
    <p v-if="passage" class="author">作者: {{ passage.author }}</p>

    <div v-if="passage" class="passage-analysis">
      <div class="analysis-header">
        <h3>原文分析</h3>
        <button
          class="analyze-button"
          @click="analyzePassage(passage?.content || '')"
          :disabled="isAnalyzing || !passage?.content"
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
        <p v-for="(segment, index) in passage?.content?.split('\n')" :key="'content-' + index">
          {{ segment }}
        </p>
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
import { ref, watch } from 'vue'
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
const analyzedTokens = ref<TokenData[]>([])
const isAnalyzing = ref(false)
const selectedWord = ref<TokenData | null>(null)

const loadPassageDetail = async (id: number) => {
  try {
    const dbPassage = await db.passages.get(id)
    if (dbPassage) {
      const contents = await db.passageContents.where({ passageId: id }).sortBy('segmentIndex')
      passage.value = {
        ...dbPassage,
        content: contents.map((c) => c.content).join('\n'),
        translation: contents.map((c) => c.translation).join('\n'),
      }
    } else {
      passage.value = null // Ensure it's null if not found
      console.warn(`Passage with ID ${id} not found in database.`)
    }
  } catch (error) {
    console.error('加载文章详情失败:', error)
    passage.value = null // Also set to null on error
  }
}

const passageId = ref<number | null>(null)

watch(
  () => route.params.id,
  async (newId) => {
    if (newId) {
      passageId.value = Number(newId)
      await loadPassageDetail(passageId.value)
    }
  },
  { immediate: true },
)

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
}

.passage-content-view h1 {
  color: #333;
  margin-bottom: 10px;
}

.passage-content-view .author {
  color: #666;
  font-style: italic;
  margin-bottom: 20px;
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
  line-height: 2.5;
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

button:hover {
  background-color: #5a6268;
}
</style>
