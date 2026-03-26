// src/components/charts/TrendChart.vue
<template>
  <div class="trend-chart-container">
    <div class="chart-header">
      <div class="chart-title">
        <span class="title-icon">📈</span>
        <span>成长趋势</span>
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
    
    <div class="current-stats">
      <div class="stat-item">
        <span class="stat-icon">💰</span>
        <span class="stat-value">{{ currentCoins }}</span>
        <span class="stat-label">当前金币</span>
      </div>
      <div class="stat-item">
        <span class="stat-icon">💎</span>
        <span class="stat-value">{{ currentGems }}</span>
        <span class="stat-label">当前宝石</span>
      </div>
    </div>
    
    <div class="chart-wrapper">
      <canvas ref="chartRef"></canvas>
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

const { trendData, fetchTrend } = useStats(props.childId)

const currentCoins = computed(() => {
  if (!trendData.value?.data?.length) return 0
  return trendData.value.data[trendData.value.data.length - 1]
})

const currentGems = computed(() => {
  // 暂时只显示金币趋势
  return 0
})

function initChart() {
  if (!chartRef.value || !trendData.value) return
  
  const ctx = chartRef.value.getContext('2d')
  
  chart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.value.labels,
      datasets: [
        {
          label: '累计金币',
          data: trendData.value.data,
          borderColor: '#FFD700',
          backgroundColor: 'rgba(255, 215, 0, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          pointHoverRadius: 6
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        intersect: false,
        mode: 'index'
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            usePointStyle: true,
            padding: 15
          }
        },
        tooltip: {
          backgroundColor: 'rgba(0,0,0,0.8)',
          padding: 10,
          cornerRadius: 8,
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0,0,0,0.05)'
          }
        },
        x: {
          grid: {
            display: false
          }
        }
      }
    }
  })
}

function updateChart() {
  if (!chart || !trendData.value) return
  
  chart.data.labels = trendData.value.labels
  chart.data.datasets[0].data = trendData.value.data
  chart.update()
}

async function changeRange(days) {
  selectedRange.value = days
  await fetchTrend(days)
  updateChart()
}

onMounted(async () => {
  await fetchTrend(selectedRange.value)
  initChart()
})

watch(trendData, updateChart, { deep: true })
</script>

<style scoped>
.trend-chart-container {
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

.current-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ec 100%);
  border-radius: 12px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.stat-icon {
  font-size: 24px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 13px;
  color: #666;
}

.chart-wrapper {
  height: 280px;
  position: relative;
}

@media (max-width: 640px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .current-stats {
    justify-content: space-around;
  }
  
  .stat-value {
    font-size: 22px;
  }
}
</style>
