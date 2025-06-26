<template>
  <div class="stats-view">
    <h1>数据统计</h1>
    <div class="stats-cards">
      <div class="stat-card">
        <h2>总单词数</h2>
        <p>{{ totalWords }}</p>
      </div>
      <div class="stat-card">
        <h2>总语法数</h2>
        <p>{{ totalGrammars }}</p>
      </div>
      <div class="stat-card">
        <h2>总文章数</h2>
        <p>{{ totalPassages }}</p>
      </div>
      <div class="stat-card">
        <h2>今日背诵</h2>
        <p>{{ todayReviewedCards }}</p>
      </div>
    </div>
    <div class="daily-stats">
      <h2>每日新增统计</h2>
      <div class="chart-container">
        <div ref="dailyNewChart" style="width: 100%; height: 300px"></div>
      </div>
    </div>

    <div class="daily-stats">
      <h2>每日 Anki 复习统计</h2>
      <div class="chart-container">
        <div ref="dailyAnkiChart" style="width: 100%; height: 300px"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { db } from '@/services/db'
import * as echarts from 'echarts'

const totalWords = ref(0)
const totalGrammars = ref(0)
const totalPassages = ref(0)

const dailyNewWords = ref<Record<string, number>>({})
const dailyNewGrammars = ref<Record<string, number>>({})
const dailyNewPassages = ref<Record<string, number>>({})
const dailyAnkiReviews = ref<Record<string, number>>({})
const todayReviewedCards = ref(0)

const dailyNewChart = ref<HTMLElement | null>(null)
const dailyAnkiChart = ref<HTMLElement | null>(null)

onMounted(async () => {
  await loadStats()
})

const loadStats = async () => {
  // 总数统计
  totalWords.value = await db.words.count()
  totalGrammars.value = await db.grammars.count()
  totalPassages.value = await db.passages.count()

  // 每日新增统计
  const words = await db.words.toArray()
  dailyNewWords.value = calculateDailyStats(words)

  const grammars = await db.grammars.toArray()
  dailyNewGrammars.value = calculateDailyStats(grammars)

  const passages = await db.passages.toArray()
  dailyNewPassages.value = calculateDailyStats(passages)

  // 每日 Anki 复习统计
  const ankiReviews = await db.ankiDailyReviews.toArray()
  dailyAnkiReviews.value = calculateDailyStats(ankiReviews, 'date')

  const today = new Date().toISOString().slice(0, 10) // 获取 YYYY-MM-DD 格式的日期
  todayReviewedCards.value = dailyAnkiReviews.value[today] || 0
}

watch([dailyNewWords, dailyNewGrammars, dailyNewPassages], () => {
  initDailyNewChart()
})

watch(dailyAnkiReviews, () => {
  initDailyAnkiChart()
})

const initDailyNewChart = () => {
  if (dailyNewChart.value) {
    const chart = echarts.init(dailyNewChart.value)
    const dates = Array.from(
      new Set([
        ...Object.keys(dailyNewWords.value),
        ...Object.keys(dailyNewGrammars.value),
        ...Object.keys(dailyNewPassages.value),
      ]),
    ).sort()

    const option = {
      title: {
        text: '每日新增统计',
      },
      tooltip: {
        trigger: 'axis',
      },
      legend: {
        data: ['单词', '语法', '文章'],
      },
      xAxis: {
        type: 'category',
        data: dates,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '单词',
          type: 'line',
          data: dates.map((date) => dailyNewWords.value[date] || 0),
        },
        {
          name: '语法',
          type: 'line',
          data: dates.map((date) => dailyNewGrammars.value[date] || 0),
        },
        {
          name: '文章',
          type: 'line',
          data: dates.map((date) => dailyNewPassages.value[date] || 0),
        },
      ],
    }
    chart.setOption(option)
  }
}

const initDailyAnkiChart = () => {
  if (dailyAnkiChart.value) {
    const chart = echarts.init(dailyAnkiChart.value)
    const dates = Object.keys(dailyAnkiReviews.value).sort()
    const option = {
      title: {
        text: '每日 Anki 复习统计',
      },
      tooltip: {
        trigger: 'axis',
      },
      xAxis: {
        type: 'category',
        data: dates,
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          name: '复习卡片数',
          type: 'line',
          data: dates.map((date) => dailyAnkiReviews.value[date] || 0),
        },
      ],
    }
    chart.setOption(option)
  }
}

interface DailyStatsItem {
  createdAt?: string
  date?: string
  reviewedCards?: number
}

const calculateDailyStats = (items: DailyStatsItem[], dateField: string = 'createdAt') => {
  const stats: Record<string, number> = {}
  items.forEach((item) => {
    let date: string | undefined
    if (dateField === 'createdAt' && item.createdAt) {
      date = new Date(item.createdAt).toLocaleDateString()
    } else if (dateField === 'date' && item.date) {
      date = item.date // AnkiDailyReview 的 date 已经是 YYYY-MM-DD 格式
    }

    if (date) {
      if (dateField === 'date') {
        stats[date] = (stats[date] || 0) + item.reviewedCards
      } else {
        stats[date] = (stats[date] || 0) + 1
      }
    }
  })
  return stats
}
</script>

<style scoped>
.stats-view {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 30px;
  color: #333;
}

.stats-cards {
  display: flex;
  justify-content: space-around;
  gap: 20px;
  margin-bottom: 40px;
}

.stat-card {
  background-color: #f0f8ff;
  border: 1px solid #b0e0e6;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  flex: 1;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
}

.stat-card h2 {
  font-size: 1.5em;
  color: #2c3e50;
  margin-bottom: 10px;
}

.stat-card p {
  font-size: 2.5em;
  font-weight: bold;
  color: #41b883;
}

.daily-stats {
  background-color: #ffffff;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
  margin-top: 20px;
}

.chart-container {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.daily-stats h2 {
  font-size: 1.8em;
  color: #333;
  margin-bottom: 20px;
  text-align: center;
}

.daily-stats h3 {
  font-size: 1.2em;
  color: #555;
  margin-top: 15px;
  margin-bottom: 10px;
  border-bottom: 1px solid #eee;
  padding-bottom: 5px;
}

.daily-stats ul {
  list-style: none;
  padding: 0;
}

.daily-stats li {
  padding: 8px 0;
  border-bottom: 1px dashed #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.daily-stats li:last-child {
  border-bottom: none;
}

.daily-stats p {
  text-align: center;
  color: #777;
  font-style: italic;
}
</style>
