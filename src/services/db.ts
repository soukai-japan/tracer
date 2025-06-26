import Dexie from 'dexie'

// 确保 Table 类型可用，如果 Dexie 不直接导出 Table，则需要这样定义
type Table<T> = import('dexie').Table<T>

export interface Word {
  id?: number
  writing: string // 书写法 (必填，唯一)
  pitch?: string // 声调 (可选)
  partOfSpeech?: string // 词性 (可选)
  reading: string // 读法 (必填)
  chineseTranslation: string // 汉语翻译 (必填)
  example?: string // 例句 (选填)
  tagIds?: number[] // 标签 (关联 Tag 表)
  createdAt?: Date // 添加创建时间字段
}

export interface Tag {
  id?: number
  name: string // 标签名称 (例如: N5)
  type: 'vocabulary' | 'grammar' | 'passage' // 标签类型，用于区分是单词、语法还是文章的标签
  createdAt?: Date
}

export interface Grammar {
  id?: number
  grammar: string
  meaning: string
  usage: string
  example?: string
  createdAt?: Date // 添加创建时间字段
}

export interface Passage {
  id?: number
  name: string
  author?: string
  source?: string
  createdAt?: Date // 添加创建时间字段
}

export interface PassageContent {
  id?: number
  passageId: number // 关联 Passage 表的 id
  type: 'original' | 'translation' // 内容类型：原文或翻译
  segmentIndex: number // 段落索引，用于保持顺序
  content: string // 段落内容
  createdAt?: Date
}

export class MySubClassedDexie extends Dexie {
  words!: Table<Word>
  grammars!: Table<Grammar>
  passages!: Table<Passage>
  passageContents!: Table<PassageContent> // 新增文章内容表
  settings!: Table<Settings>
  tags!: Table<Tag>
  ankiDailyReviews!: Table<AnkiDailyReview>

  constructor() {
    super('soukaiJapanDatabase')
    this.version(2).stores({
      words:
        '++id, &writing, pitch, partOfSpeech, reading, chineseTranslation, example, *tagIds, createdAt',
      grammars: '++id, &grammar, meaning, usage, example, createdAt',
      passages: '++id, name, author, source, createdAt',
      passageContents: '++id, passageId, type, segmentIndex, content, createdAt', // 新增文章内容表
      settings: 'id',
      tags: '++id, &name, type, createdAt', // 新增 tags 表
      ankiDailyReviews: '++id, &date, reviewedCards, createdAt',
    })
  }
}

export interface AnkiDailyReview {
  id?: number
  date: string // YYYY-MM-DD 格式的日期
  reviewedCards: number
  createdAt?: Date
}

export interface Settings {
  id: string // e.g., 'ai_settings'
  siliconflowApiKey?: string
  selectedAiModel?: string // 新增字段，用于存储用户选择的AI模型
  ankiConnectUrl?: string // Anki Connect 的 URL
}

export const db = new MySubClassedDexie()
