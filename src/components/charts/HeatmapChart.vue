// src/components/charts/HeatmapChart.vue
<template>
  <div class="heatmap-container">
    <div class="chart-header">
      <div class="chart-title">
        <span class="title-icon">🔥</span>
        <span>行为热力图</span>
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
    
    <div class="heatmap-wrapper">
      <div class="heatmap">
        <div v-for="(week, weekIdx) in weeks" :key="weekIdx" class="week">
          <div 
            v-for="(day, dayIdx) in week" 
            :key="dayIdx"
            :class="['day-cell', getLevelClass(day?.score)]"
            :title="day ? formatDate(day.date) + ': ' + (day.score || 0) + '分' : ''"
            @click="day && $emit('select', day.date)"
          >
          </div>
        </div>
      </div>
      
      <div class="legend">
        <span class="legend-label">少</span>
        <div class="legend-item"></div>
        <div class="legend-item level-1"></div>
        <div class="legend-item level-2"></div>
        <div class="legend-item level-3"></div>
        <div class="legend-item level-4"></div>
        <span class="legend-label">多</span>
      </div>
    </div>
    
    <div class="heatmap-stats">
      <div class="stat">
        <span class="stat-value">{{ activeDays }}</span>
        <span class="stat-label">活跃天数</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ maxStreak }}</span>
        <span class="stat-label">最长连胜</span>
      </div>
      <div class="stat">
        <span class="stat-value">{{ avgScore }}</span>
        <span class="stat-label">日均积分</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useStats } from '../../composables/useStats.js'

const props = defineProps({
  childId: { type: String, required: true }
})

defineEmits(['select'])

const ranges = [
  { value: 1, label: '1个月' },
  { value: 3, label: '3个月' },
  { value: 6, label: '6个月' }
]

const selectedRange = ref(3)
const { heatmapData, fetchHeatmap } = useStats(props.childId)

function getLevelClass(score) {
  if (!score || score <= 0) return 'level-0'
  if (score <= 5) return 'level-1'
  if (score <= 15) return 'level-2'
  if (score <= 30) return 'level-3'
  return 'level-4'
}

function formatDate(dateStr) {
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

const weeks = computed(() => {
  if (!heatmapData.value) return []
  
  const days = []
  const today = new Date()
  const startDate = new Date()
  startDate.setMonth(startDate.getMonth() - selectedRange.value)
  
  // 调整到周一开始
  const startDay = startDate.getDay()
  startDate.setDate(startDate.getDate() - (startDay === 0 ? 6 : startDay - 1))
  
  for (let d = new Date(startDate); d <= today; d.setDate(d.getDate() + 1)) {
    const dateStr = d.toISOString().split('T')[0]
    days.push({
      date: dateStr,
      score: heatmapData.value[dateStr] || 0
    })
  }
  
  // 分组为周
  const weeks = []
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7))
  }
  
  return weeks
})

const activeDays = computed(() => {
  if (!heatmapData.value) return 0
  return Object.values(heatmapData.value).filter(v => v > 0).length
})

const maxStreak = computed(() => {
  if (!heatmapData.value) return 0
  
  const sortedDates = Object.keys(heatmapData.value).sort()
  let maxStreak = 0
  let currentStreak = 0
  let prevDate = null
  
  for (const dateStr of sortedDates) {
    if (heatmapData.value[dateStr] <= 0) continue
    
    const date = new Date(dateStr)
    if (prevDate) {
      const diff = (date - prevDate) / (1000 * 60 * 60 * 24)
      if (diff === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    prevDate = date
  }
  
  return Math.max(maxStreak, currentStreak)
})

const avgScore = computed(() => {
  if (!heatmapData.value) return 0
  const values = Object.values(heatmapData.value)
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round(sum / values.length)
})

async function changeRange(months) {
  selectedRange.value = months
  await fetchHeatmap(months)
}

onMounted(() => {
  fetchHeatmap(selectedRange.value)
})

watch(() => props.childId, () => {
  fetchHeatmap(selectedRange.value)
})
</script>

<style scoped>
.heatmap-container {
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

.heatmap-wrapper {
  overflow-x: auto;
  padding-bottom: 8px;
}

.heatmap {
  display: flex;
  gap: 4px;
  min-width: fit-content;
  padding: 8px 0;
}

.week {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.day-cell {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  cursor: pointer;
  transition: transform 0.2s;
}

.day-cell:hover {
  transform: scale(1.3);
  box-shadow: 0 0 4px rgba(0,0,0,0.2);
}

.level-0 { background: #ebedf0; }
.level-1 { background: #9be9a8; }
.level-2 { background: #40c463; }
.level-3 { background: #30a14e; }
.level-4 { background: #216e39; }

.legend {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  margin-top: 16px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 8px;
}

.legend-label {
  font-size: 12px;
  color: #666;
}

.legend-item {
  width: 14px;
  height: 14px;
  border-radius: 3px;
  background: #ebedf0;
}

.heatmap-stats {
  display: flex;
  justify-content: space-around;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #eee;
}

.stat {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: 700;
  color: #333;
}

.stat-label {
  font-size: 12px;
  color: #666;
}

@media (max-width: 640px) {
  .chart-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .heatmap-stats {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
