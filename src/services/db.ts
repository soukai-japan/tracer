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
  content: string
  translation: string
  createdAt?: Date // 添加创建时间字段
}

export class MySubClassedDexie extends Dexie {
  words!: Table<Word>
  grammars!: Table<Grammar>
  passages!: Table<Passage>
  settings!: Table<Settings>
  tags!: Table<Tag>

  constructor() {
    super('soukaiJapanDatabase')
    this.version(2).stores({
      words: '++id, &writing, pitch, partOfSpeech, reading, chineseTranslation, example, *tagIds, createdAt',
      grammars: '++id, &grammar, meaning, usage, example, createdAt',
      passages: '++id, name, author, source, content, translation, createdAt',
      settings: 'id',
      tags: '++id, &name, type, createdAt' // 新增 tags 表
    })
  }
}

export interface Settings {
  id: string // e.g., 'ai_settings'
  siliconflowApiKey?: string
  selectedAiModel?: string // 新增字段，用于存储用户选择的AI模型
}

export const db = new MySubClassedDexie()
