<template>
  <div class="settings-view">
    <h1>应用设置</h1>

    <section class="settings-section">
      <h2>AI 模块设置</h2>
      <div class="form-group">
        <label for="siliconflow-api-key">SiliconFlow API Key:</label>
        <input type="password" id="siliconflow-api-key" v-model="siliconflowApiKey" />
      </div>
      <div class="form-group">
        <label for="ai-model-input">AI 模型:</label>
        <input
          type="text"
          id="ai-model-input"
          v-model="selectedAiModel"
          placeholder="请输入AI模型名称"
        />
      </div>
      <button @click="saveSettings">保存设置</button>
    </section>

    <section class="settings-section">
      <h2>Anki 同步设置</h2>
      <div class="form-group">
        <label for="anki-connect-url">Anki Connect 地址:</label>
        <input
          type="text"
          id="anki-connect-url"
          v-model="ankiConnectUrl"
          placeholder="http://127.0.0.1:8765"
        />
      </div>
      <div class="form-group auto-sync-group">
        <label for="auto-sync-interval">自动同步间隔 (分钟):</label>
        <input type="number" id="auto-sync-interval" v-model.number="autoSyncInterval" min="1" />
        <button @click="manualSync" class="manual-sync-button">手动同步</button>
      </div>
      <h3>Deck 配置</h3>
      <div v-for="(deck, index) in ankiDecks" :key="index" class="deck-list-item">
        <span>{{ deck.name || '未命名 Deck' }}</span>
        <div>
          <button @click="editDeck(deck)" class="edit-deck-button">编辑</button>
          <button @click="removeDeck(index)" class="remove-button">移除</button>
        </div>
      </div>
      <button @click="addNewDeck" class="add-deck-button">添加 Deck</button>
      <button @click="saveSettings">保存设置</button>
    </section>
    <section class="settings-section">
      <h2>数据管理</h2>
      <button @click="exportData">导出所有数据</button>
    </section>
  </div>

  <!-- Deck 编辑/添加弹窗 -->
  <div v-if="isModalOpen" class="modal-overlay">
    <div class="modal-content">
      <h3>
        {{ currentEditingDeck?.name ? '编辑 Deck: ' + currentEditingDeck.name : '添加新 Deck' }}
      </h3>
      <div class="form-group">
        <label for="modal-deck-name">Deck 名称:</label>
        <input type="text" id="modal-deck-name" v-model="currentEditingDeck!.name" />
      </div>
      <h4>Field 关键字配置</h4>
      <div v-for="field in currentEditingDeck?.fields" :key="field.id" class="field-config-item">
        <div class="form-group field-input-group">
          <input
            type="text"
            :value="field.key"
            placeholder="字段名"
            class="field-key-input"
            @input="
              (event) =>
                updateFieldKey(
                  currentEditingDeck!,
                  field.id,
                  (event.target as HTMLInputElement).value,
                )
            "
          />
          <span class="field-separator">:</span>
          <input
            type="text"
            v-model="field.value"
            placeholder="显示名称"
            class="field-value-input"
          />
          <button @click="removeField(currentEditingDeck!, field.id)" class="remove-field-button">
            -
          </button>
        </div>
      </div>
      <button @click="addField(currentEditingDeck!)" class="add-field-button">添加 Field</button>
      <div class="modal-actions">
        <button @click="saveDeckChanges">保存</button>
        <button @click="closeModal">取消</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'
import { syncAnkiDailyReviews } from '@/services/anki-sync'

const siliconflowApiKey = ref('')
const selectedAiModel = ref('')
const ankiConnectUrl = ref('http://127.0.0.1:8765')
const autoSyncInterval = ref(5) // 默认5分钟
interface AnkiFieldConfig {
  id: string
  key: string
  value: string
}

interface AnkiDeckConfig {
  name: string
  fields: AnkiFieldConfig[]
}

interface AnkiDeckSaveConfig {
  name: string
  fields: Record<string, string>
}

interface Settings {
  id: string
  siliconflowApiKey?: string
  selectedAiModel?: string
  ankiConnectUrl?: string
  autoSyncInterval?: number
  ankiDecks?: AnkiDeckSaveConfig[]
}

const ankiDecks = ref<AnkiDeckConfig[]>([])

const isModalOpen = ref(false)
const currentEditingDeck = ref<AnkiDeckConfig | null>(null)

const addNewDeck = () => {
  currentEditingDeck.value = {
    name: '',
    fields: [
      {
        id:
          Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
        key: 'field1',
        value: '',
      },
    ],
  }
  isModalOpen.value = true
}

const editDeck = (deck: AnkiDeckConfig) => {
  // 创建一个深拷贝，避免直接修改原始数据，直到保存时才更新
  currentEditingDeck.value = JSON.parse(JSON.stringify(deck))
  isModalOpen.value = true
}

const saveDeckChanges = () => {
  if (currentEditingDeck.value) {
    const index = ankiDecks.value.findIndex((d) => d === currentEditingDeck.value)
    if (index === -1) {
      // 新增 Deck
      ankiDecks.value.push(currentEditingDeck.value)
    } else {
      // 编辑现有 Deck
      ankiDecks.value[index] = currentEditingDeck.value
    }
  }
  closeModal()
}

const manualSync = async () => {
  console.log('手动同步 Anki')
  try {
    await syncAnkiDailyReviews()
    alert('Anki 同步完成！')
  } catch (error) {
    console.error('Anki 同步失败:', error)
    alert('Anki 同步失败，请检查 Anki Connect 是否运行以及 URL 配置是否正确。')
  }
}

const closeModal = () => {
  isModalOpen.value = false
  currentEditingDeck.value = null
}

onMounted(async () => {
  // Load settings from IndexedDB
  const aiSettings = await db.settings.get('ai_settings')
  if (aiSettings) {
    siliconflowApiKey.value = aiSettings.siliconflowApiKey || ''
    selectedAiModel.value = aiSettings.selectedAiModel || ''
  }
  const ankiSettings = (await db.settings.get('anki_settings')) as Settings
  if (ankiSettings) {
    ankiConnectUrl.value = ankiSettings.ankiConnectUrl || 'http://127.0.0.1:8765'
    autoSyncInterval.value = ankiSettings.autoSyncInterval || 5 // 加载自动同步间隔
    // 确保加载的数据结构与新的 AnkiFieldConfig 匹配
    ankiDecks.value =
      ankiSettings.ankiDecks?.map((deck: AnkiDeckSaveConfig) => {
        const fields = Object.entries(deck.fields).map(([key, value]) => ({
          id:
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15),
          key: key,
          value: value,
        }))
        return {
          name: deck.name,
          fields: fields,
        }
      }) || []
  }
})

const removeDeck = (index: number) => {
  ankiDecks.value.splice(index, 1)
}

const addField = (deck: AnkiDeckConfig) => {
  const newId =
    Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
  let newKey = `field${deck.fields.length + 1}`
  // 确保新生成的 key 不重复
  while (deck.fields.some((field) => field.key === newKey)) {
    newKey = `field${deck.fields.length + 1 + Math.floor(Math.random() * 100)}`
  }
  deck.fields.push({ id: newId, key: newKey, value: '' })
}

const removeField = (deck: AnkiDeckConfig, fieldId: string) => {
  const index = deck.fields.findIndex((field) => field.id === fieldId)
  if (index !== -1) {
    deck.fields.splice(index, 1)
  }
}

const updateFieldKey = (deck: AnkiDeckConfig, fieldId: string, newKey: string) => {
  const fieldToUpdate = deck.fields.find((field) => field.id === fieldId)
  if (fieldToUpdate) {
    if (deck.fields.some((field) => field.key === newKey && field.id !== fieldId)) {
      alert(`字段名 '${newKey}' 已存在，请使用其他名称。`)
    } else {
      fieldToUpdate.key = newKey
    }
  }
}

const saveSettings = async () => {
  // 将 ankiDecks 转换回 Record<string, string> 格式进行保存
  const ankiDecksToSave: AnkiDeckSaveConfig[] = ankiDecks.value.map((deck) => {
    const fieldsRecord: Record<string, string> = {}
    deck.fields.forEach((field: AnkiFieldConfig) => {
      fieldsRecord[field.key] = field.value
    })
    return {
      name: deck.name,
      fields: fieldsRecord,
    }
  })

  await db.settings.put({
    id: 'ai_settings',
    siliconflowApiKey: siliconflowApiKey.value,
    selectedAiModel: selectedAiModel.value,
  })

  // 保存 Anki 设置
  await db.settings.put({
    id: 'anki_settings',
    ankiConnectUrl: ankiConnectUrl.value,
    autoSyncInterval: autoSyncInterval.value, // 保存自动同步间隔
    ankiDecks: ankiDecksToSave,
  } as Settings)
  alert('设置已保存！')
}

const exportData = async () => {
  try {
    const allData = {
      words: await db.words.toArray(),
      grammars: await db.grammars.toArray(),
      passages: await db.passages.toArray(),
      settings: await db.settings.toArray(),
    }
    const dataStr = JSON.stringify(allData, null, 2)
    const blob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `soukai_japan_data_${new Date().toISOString().slice(0, 10)}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error('导出数据失败:', error)
    alert('导出数据失败，请查看控制台了解详情。')
  }
}
</script>

<style scoped>
.settings-view {
  padding: 20px;
}

.settings-section {
  margin-bottom: 30px;
  padding: 20px;
  border: 1px solid #eee;
  border-radius: 8px;
  background-color: #f9f9f9;
}

.settings-section h2 {
  color: #007bff;
  margin-top: 0;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: bold;
  color: #333;
}

.form-group input[type='password'] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box; /* Include padding in width */
}

.form-group input[type='text'] {
  width: 100%;
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  font-size: 16px;
  box-sizing: border-box;
}

button {
  padding: 10px 20px;
  background-color: #007bff;
  color: white;
  border: none;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
}

button:hover {
  background-color: #0056b3;
}

.deck-config-item {
  border: 1px solid #e0e0e0;
  padding: 15px;
  margin-bottom: 15px;
  border-radius: 5px;
  background-color: #f0f0f0;
}

.deck-config-item .form-group {
  margin-bottom: 10px;
}

.deck-config-item label {
  font-size: 0.9em;
  color: #555;
}

.deck-config-item input[type='text'] {
  width: calc(100% - 20px);
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.remove-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9em;
  margin-top: 10px;
}

.remove-button:hover {
  background-color: #c82333;
}

.field-config-item {
  margin-left: 15px;
  margin-bottom: 10px;
  padding: 10px;
  border: 1px solid #e9e9e9;
  border-radius: 4px;
  background-color: #fcfcfc;
}

.field-input-group {
  display: flex;
  align-items: center;
  gap: 5px;
}

.field-key-input,
.field-value-input {
  flex-grow: 1;
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
}

.field-separator {
  font-weight: bold;
  color: #555;
}

.remove-field-button {
  background-color: #dc3545;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
}

.remove-field-button:hover {
  background-color: #c82333;
}

.add-field-button {
  background-color: #28a745;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 10px;
}

.add-field-button:hover {
  background-color: #218838;
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
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 90%;
  max-width: 600px;
  max-height: 80%;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  margin-bottom: 20px;
  color: #007bff;
}

.modal-actions {
  margin-top: 20px;
  text-align: right;
}

.modal-actions button {
  background-color: #6c757d;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 16px;
}

.modal-actions button:hover {
  background-color: #5a6268;
}
.deck-list-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px;
  margin-bottom: 8px;
  background-color: #f9f9f9;
  border: 1px solid #eee;
  border-radius: 4px;
  transition:
    background-color 0.3s ease,
    box-shadow 0.3s ease;
}

.deck-list-item:hover {
  background-color: #e0e0e0;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
}

.deck-list-item span {
  font-weight: bold;
  color: #111;
}

.edit-deck-button,
.add-deck-button {
  background-color: #42b983;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s ease;
}

.edit-deck-button:hover,
.add-deck-button:hover {
  background-color: #369f6e;
}

.add-deck-button {
  margin-top: 15px;
  width: 100%;
}

.remove-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 8px;
  transition: background-color 0.3s ease;
}

.remove-button:hover {
  background-color: #c0392b;
}

.manual-sync-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px; /* Add margin to separate from input */
  transition: background-color 0.3s ease;
}

.manual-sync-button:hover {
  background-color: #0056b3;
}

.auto-sync-group {
  display: flex;
  align-items: center;
  gap: 10px; /* Space between input and button */
}

.auto-sync-group input {
  flex-grow: 1; /* Allow input to take available space */
  padding: 8px;
  border: 1px solid #ccc;
  border-radius: 4px;
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
  border-radius: 8px;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
  width: 90%;
  max-width: 500px;
  max-height: 80vh;
  overflow-y: auto;
}

.modal-content h3 {
  margin-top: 0;
  color: #333;
  font-size: 22px;
  border-bottom: 1px solid #eee;
  padding-bottom: 15px;
  margin-bottom: 20px;
}

.modal-content h4 {
  margin-top: 20px;
  margin-bottom: 15px;
  color: #555;
  font-size: 18px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 25px;
  padding-top: 15px;
  border-top: 1px solid #eee;
}

.modal-actions button {
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s ease;
}

.modal-actions button:first-child {
  background-color: #42b983;
  color: white;
  border: none;
}

.modal-actions button:first-child:hover {
  background-color: #369f6e;
}

.modal-actions button:last-child {
  background-color: #ccc;
  color: #333;
  border: none;
}

.modal-actions button:last-child:hover {
  background-color: #bbb;
}

.field-config-item {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
  background-color: #f0f0f0;
  padding: 8px;
  border-radius: 4px;
}

.field-input-group {
  display: flex;
  align-items: center;
  flex-grow: 1;
  gap: 5px;
}

.field-key-input,
.field-value-input {
  flex: 1;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
}

.field-separator {
  font-weight: bold;
  color: #555;
}

.remove-field-button {
  background-color: #e74c3c;
  color: white;
  border: none;
  padding: 6px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-left: 10px;
  transition: background-color 0.3s ease;
}

.remove-field-button:hover {
  background-color: #c0392b;
}

.add-field-button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 8px 15px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  margin-top: 15px;
  transition: background-color 0.3s ease;
}

.add-field-button:hover {
  background-color: #0056b3;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input[type='text'],
.form-group input[type='password'] {
  width: calc(100% - 20px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.settings-section button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

.settings-section button:hover {
  background-color: #0056b3;
}

.settings-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
  font-family: 'Arial', sans-serif;
  color: #333;
}

h1 {
  color: #2c3e50;
  text-align: center;
  margin-bottom: 30px;
  font-size: 28px;
}

.settings-section {
  background-color: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 25px;
  margin-bottom: 25px;
}

.settings-section h2 {
  color: #34495e;
  margin-top: 0;
  margin-bottom: 20px;
  font-size: 24px;
  border-bottom: 1px solid #eee;
  padding-bottom: 10px;
}

.settings-section h3 {
  color: #34495e;
  margin-top: 20px;
  margin-bottom: 15px;
  font-size: 20px;
}

.form-group {
  margin-bottom: 15px;
}

.form-group label {
  display: block;
  margin-bottom: 5px;
  font-weight: bold;
  color: #555;
}

.form-group input[type='text'],
.form-group input[type='password'] {
  width: calc(100% - 20px);
  padding: 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 16px;
}

.settings-section button {
  background-color: #007bff;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 5px;
  cursor: pointer;
  font-size: 16px;
  margin-top: 10px;
  transition: background-color 0.3s ease;
}

.settings-section button:hover {
  background-color: #0056b3;
}
</style>
