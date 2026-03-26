// src/components/charts/RadarChart.vue
<template>
  <div class="radar-chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <span class="title-icon">🎯</span>
        <span>能力雷达</span>
      </div>
      <div class="chart-filters">
        <button 
          v-for="range in ranges" 
          :key="range.value"
          :class="['filter-btn', { active: selectedRange === range.value }]"
          @click="changeRange(range.value)"
        >
          {{ range.label }}
        </button>
      </div>
    </div>
    
    <div class="chart-wrapper">
      <canvas ref="chartRef"></canvas>
    </div>
    
    <div v-if="insights.length > 0" class="insights">
      <div class="insight-title">💡 发现</div>
      <div v-for="(insight, idx) in insights" :key="idx" class="insight-item">
        {{ insight }}
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, computed } from 'vue'
import Chart from 'chart.js/auto'
import { useStats } from '../../composables/useStats.js'

const props = defineProps({
  childId: { type: String, required: true }
})

const ranges = [
  { value: 7, label: '7天' },
  { value: 30, label: '30天' },
  { value: 90, label: '90天' }
]

const selectedRange = ref(30)
const chartRef = ref(null)
let chart = null

const { categoryData, fetchCategories } = useStats(props.childId)

const categories = ['运动健康', '学习成长', '生活自理', '艺术创造', '品德社交', '作息规律', '健康饮食', '其他']
const categoryColors = ['#ff6b6b', '#4ecdc4', '#95e1d3', '#f38181', '#aa96da', '#fcbad3', '#a8e6cf', '#ffd93d']

const insights = computed(() => {
  if (!categoryData.value) return []
  
  const sorted = Object.entries(categoryData.value).sort((a, b) => b[1] - a[1])
  const result = []
  
  if (sorted.length > 0) {
    result.push(`强项：${sorted[0][0]}（${sorted[0][1]}分）`)
  }
  if (sorted.length > 1 && sorted[sorted.length - 1][1] < sorted[0][1] / 2) {
    result.push(`待加强：${sorted[sorted.length - 1][0]}（${sorted[sorted.length - 1][1]}分）`)
  }
  
  return result
})

function initChart() {
  if (!chartRef.value || !categoryData.value) return
  
  const data = categories.map(cat => categoryData.value[cat] || 0)
  
  const ctx = chartRef.value.getContext('2d')
  
  chart = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: categories,
      datasets: [{
        label: '得分',
        data: data,
        backgroundColor: 'rgba(76, 175, 80, 0.2)',
        borderColor: '#4CAF50',
        pointBackgroundColor: categoryColors,
        pointBorderColor: '#fff',
        pointHoverBackgroundColor: '#fff',
        pointHoverBorderColor: categoryColors,
        pointRadius: 5,
        pointHoverRadius: 7
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        r: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.1)'
          },
          pointLabels: {
            font: { size: 12 },
            color: '#333'
          }
        }
      }
    }
  })
}

function updateChart() {
  if (!chart || !categoryData.value) return
  
  const data = categories.map(cat => categoryData.value[cat] || 0)
  chart.data.datasets[0].data = data
  chart.update()
}

async function changeRange(days) {
  selectedRange.value = days
  await fetchCategories(days)
  updateChart()
}

onMounted(async () => {
  await fetchCategories()
  initChart()
})

watch(categoryData, updateChart, { deep: true })
</script>

<style scoped>
.radar-chart-container {
  background: white;
  border-radius: 16px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.08);
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  flex-wrap: wrap;
  gap: 12px;
}

.chart-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
}

.title-icon {
  font-size: 22px;
}

.chart-filters {
  display: flex;
  gap: 8px;
}

.filter-btn {
  padding: 6px 14px;
  border: 1px solid #e0e0e0;
  border-radius: 20px;
  background: white;
  cursor: pointer;
  font-size: 13px;
  transition: all 0.2s;
}

.filter-btn:hover {
  border-color: #4CAF50;
  color: #4CAF50;
}

.filter-btn.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.chart-wrapper {
  height: 320px;
  position: relative;
}

.insights {
  margin-top: 16px;
  padding: 12px 16px;
  background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
  border-radius: 12px;
}

.insight-title {
  font-weight: 600;
  margin-bottom: 8px;
  color: #2e7d32;
}

.insight-item {
  font-size: 14px;
  color: #555;
  padding: 4px 0;
}

@media (max-width: 640px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .chart-wrapper {
    height: 280px;
  }
}
</style>
