import Dexie from 'dexie'

// 确保 Table 类型可用，如果 Dexie 不直接导出 Table，则需要这样定义
type Table<T> = import('dexie').Table<T>

export interface Word {
  id?: number
  word: string
  meaning: string
  pronunciation?: string
  example?: string
  createdAt?: Date // 添加创建时间字段
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

  constructor() {
    super('soukaiJapanDatabase')
    this.version(1).stores({
      words: '++id, &word, meaning, pronunciation, example, createdAt',
      grammars: '++id, &grammar, meaning, usage, example, createdAt',
      passages: '++id, name, author, source, content, translation, createdAt',
      settings: 'id',
    })
  }
}

export interface Settings {
  id: string // e.g., 'ai_settings'
  siliconflowApiKey?: string
  selectedAiModel?: string // 新增字段，用于存储用户选择的AI模型
}

export const db = new MySubClassedDexie()
