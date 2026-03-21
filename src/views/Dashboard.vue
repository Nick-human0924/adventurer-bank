<template>
  <div class="dashboard">
    <h2 class="page-title">📊 仪表盘</h2>
    
    <!-- 统计卡片 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">👶</div>
        <div class="stat-content">
          <h3>总孩子数</h3>
          <div class="number">{{ stats.totalChildren }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon green">💰</div>
        <div class="stat-content">
          <h3>总积分发放</h3>
          <div class="number">{{ stats.totalPointsEarned }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon orange">🎯</div>
        <div class="stat-content">
          <h3>今日行为记录</h3>
          <div class="number">{{ stats.todayTransactions }}</div>
        </div>
      </div>
      
      <div class="stat-card">
        <div class="stat-icon purple">📋</div>
        <div class="stat-content">
          <h3>活跃规则</h3>
          <div class="number">{{ stats.activeRules }}</div>
        </div>
      </div>
    </div>
    
    <!-- 图表区域 -->
    <div class="charts-grid">
      <div class="card">
        <div class="card-title">📈 积分趋势（近7天）</div>
        <div ref="trendChart" class="chart"></div>
      </div>
      
      <div class="card">
        <div class="card-title">🥧 行为类型分布</div>
        <div ref="pieChart" class="chart"></div>
      </div>
    </div>
    
    <!-- 最近交易记录 -->
    <div class="card">
      <div class="card-title">📝 最近交易记录</div>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>孩子</th>
              <th>行为</th>
              <th>积分</th>
              <th>类型</th>
              <th>备注</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in recentTransactions" :key="tx.id">
              <td>{{ formatDate(tx.created_at) }}</td>
              <td>{{ tx.child_name }}</td>
              <td>{{ tx.rule_name }}</td>
              <td :class="tx.type === 'earn' ? 'text-success' : 'text-danger'">
                {{ tx.type === 'earn' ? '+' : '-' }}{{ tx.points }}
              </td>
              <td>
                <span :class="['badge', tx.type === 'earn' ? 'badge-success' : 'badge-danger']">
                  {{ tx.type === 'earn' ? '获得' : '消费' }}
                </span>
              </td>
              <td>{{ tx.note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    
    <!-- 快速操作 -->
    <div class="card">
      <div class="card-title">⚡ 快速操作</div>
      <div class="quick-actions">
        <button class="btn btn-success" @click="showAddPoints = true">
          ➕ 奖励积分
        </button>
        <button class="btn btn-danger" @click="showDeductPoints = true">
          ➖ 扣除积分
        </button>
        <button class="btn btn-primary" @click="refreshData">
          🔄 刷新数据
        </button>
      </div>
    </div>
    
    <!-- 添加积分弹窗 -->
    <div v-if="showAddPoints" class="modal-overlay" @click.self="showAddPoints = false">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">➕ 奖励积分</span>
          <button class="close-btn" @click="showAddPoints = false">&times;</button>
        </div>
        
        <div class="form-group">
          <label>选择孩子</label>
          <select v-model="newTransaction.child_id">
            <option v-for="child in children" :key="child.id" :value="child.id">
              {{ child.name }}
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>选择规则</label>
          <select v-model="newTransaction.rule_id">
            <option v-for="rule in goodRules" :key="rule.id" :value="rule.id">
              {{ rule.name }} (+{{ rule.points }}分)
            </option>
          </select>
        </div>
        
        <div class="form-group">
          <label>备注（可选）</label>
          <input v-model="newTransaction.note" placeholder="输入备注..." />
        </div>
        
        <button class="btn btn-success" @click="addTransaction('earn')">
          确认奖励
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, reactive } from 'vue'
import * as echarts from 'echarts'
import { supabase, subscribeToTable } from '../utils/supabase.js'

const trendChart = ref(null)
const pieChart = ref(null)
const showAddPoints = ref(false)
const showDeductPoints = ref(false)

const stats = reactive({
  totalChildren: 0,
  totalPointsEarned: 0,
  todayTransactions: 0,
  activeRules: 0
})

const children = ref([])
const goodRules = ref([])
const recentTransactions = ref([])
const newTransaction = reactive({
  child_id: '',
  rule_id: '',
  note: ''
})

let trendChartInstance = null
let pieChartInstance = null
let subscriptions = []

// 加载统计数据
async function loadStats() {
  // 总孩子数
  const { count: childCount } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
  stats.totalChildren = childCount || 0

  // 总积分发放
  const { data: earnedData } = await supabase
    .from('transactions')
    .select('points')
    .eq('type', 'earn')
  stats.totalPointsEarned = earnedData?.reduce((sum, t) => sum + t.points, 0) || 0

  // 今日交易
  const today = new Date().toISOString().split('T')[0]
  const { count: todayCount } = await supabase
    .from('transactions')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', today)
  stats.todayTransactions = todayCount || 0

  // 活跃规则
  const { count: rulesCount } = await supabase
    .from('rules')
    .select('*', { count: 'exact', head: true })
    .eq('is_active', true)
  stats.activeRules = rulesCount || 0
}

// 加载孩子列表
async function loadChildren() {
  const { data } = await supabase.from('children').select('*').order('name')
  children.value = data || []
}

// 加载规则
async function loadRules() {
  const { data } = await supabase
    .from('rules')
    .select('*')
    .eq('type', 'good')
    .eq('is_active', true)
    .order('name')
  goodRules.value = data || []
}

// 加载交易记录
async function loadTransactions() {
  const { data } = await supabase
    .from('transactions')
    .select(`
      *,
      children(name),
      rules(name)
    `)
    .order('created_at', { ascending: false })
    .limit(10)
  
  recentTransactions.value = (data || []).map(t => ({
    ...t,
    child_name: t.children?.name,
    rule_name: t.rules?.name
  }))
}

// 初始化趋势图
function initTrendChart() {
  if (!trendChart.value) return
  
  trendChartInstance = echarts.init(trendChart.value)
  
  const dates = []
  const earned = []
  const spent = []
  
  for (let i = 6; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    dates.push(d.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }))
    earned.push(Math.floor(Math.random() * 50) + 20)
    spent.push(Math.floor(Math.random() * 30) + 10)
  }
  
  const option = {
    tooltip: { trigger: 'axis' },
    legend: { data: ['获得积分', '消费积分'] },
    grid: { left: '3%', right: '4%', bottom: '3%', containLabel: true },
    xAxis: { type: 'category', boundaryGap: false, data: dates },
    yAxis: { type: 'value' },
    series: [
      {
        name: '获得积分',
        type: 'line',
        smooth: true,
        data: earned,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(17, 153, 142, 0.3)' },
            { offset: 1, color: 'rgba(17, 153, 142, 0.05)' }
          ])
        },
        itemStyle: { color: '#11998e' }
      },
      {
        name: '消费积分',
        type: 'line',
        smooth: true,
        data: spent,
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(255, 65, 108, 0.3)' },
            { offset: 1, color: 'rgba(255, 65, 108, 0.05)' }
          ])
        },
        itemStyle: { color: '#ff416c' }
      }
    ]
  }
  
  trendChartInstance.setOption(option)
}

// 初始化饼图
function initPieChart() {
  if (!pieChart.value) return
  
  pieChartInstance = echarts.init(pieChart.value)
  
  const option = {
    tooltip: { trigger: 'item' },
    legend: { orient: 'vertical', right: '5%', top: 'center' },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' }
        },
        data: [
          { value: 35, name: '学习表现', itemStyle: { color: '#667eea' } },
          { value: 25, name: '家务劳动', itemStyle: { color: '#11998e' } },
          { value: 20, name: '体育锻炼', itemStyle: { color: '#f093fb' } },
          { value: 15, name: '社交礼仪', itemStyle: { color: '#4facfe' } },
          { value: 5, name: '其他', itemStyle: { color: '#ff9f43' } }
        ]
      }
    ]
  }
  
  pieChartInstance.setOption(option)
}

// 添加交易
async function addTransaction(type) {
  const rule = goodRules.value.find(r => r.id === newTransaction.rule_id)
  if (!rule) return

  const { error } = await supabase.from('transactions').insert({
    child_id: newTransaction.child_id,
    rule_id: newTransaction.rule_id,
    points: rule.points,
    type,
    note: newTransaction.note
  })

  if (!error) {
    showAddPoints.value = false
    newTransaction.child_id = ''
    newTransaction.rule_id = ''
    newTransaction.note = ''
    await refreshData()
  }
}

// 刷新数据
async function refreshData() {
  await Promise.all([
    loadStats(),
    loadChildren(),
    loadRules(),
    loadTransactions()
  ])
}

// 格式化日期
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

onMounted(async () => {
  await refreshData()
  
  nextTick(() => {
    initTrendChart()
    initPieChart()
  })
  
  // 订阅实时更新
  subscriptions.push(
    subscribeToTable('transactions', () => {
      loadTransactions()
      loadStats()
    })
  )
})

onUnmounted(() => {
  subscriptions.forEach(sub => sub.unsubscribe())
  trendChartInstance?.dispose()
  pieChartInstance?.dispose()
})
</script>

<style scoped>
.page-title {
  margin-bottom: 24px;
  color: #333;
}

.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart {
  height: 300px;
}

.quick-actions {
  display: flex;
  gap: 15px;
  flex-wrap: wrap;
}

.text-success {
  color: #11998e;
  font-weight: 600;
}

.text-danger {
  color: #ff416c;
  font-weight: 600;
}
</style>
