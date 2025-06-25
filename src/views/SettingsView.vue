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
      <h2>数据管理</h2>
      <button @click="exportData">导出所有数据</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { db } from '@/services/db'

const siliconflowApiKey = ref('')
const selectedAiModel = ref('')

onMounted(async () => {
  // Load settings from IndexedDB
  const settings = await db.settings.get('ai_settings')
  if (settings) {
    siliconflowApiKey.value = settings.siliconflowApiKey || ''
    selectedAiModel.value = settings.selectedAiModel || ''
  }
})

const saveSettings = async () => {
  await db.settings.put({
    id: 'ai_settings',
    siliconflowApiKey: siliconflowApiKey.value,
    selectedAiModel: selectedAiModel.value,
  })
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
</style>
