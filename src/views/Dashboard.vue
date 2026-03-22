<template>
  <div class="dashboard">
    <!-- 页面标题和刷新按钮 -->
    <div class="page-header">
      <h2 class="page-title">📊 仪表盘</h2>
      <button class="refresh-btn" @click="refreshData" :disabled="isRefreshing">
        <span v-if="isRefreshing">🔄 刷新中...</span>
        <span v-else>🔄 刷新</span>
      </button>
    </div>
    
    <!-- 快捷操作台 - 游戏化新设计 -->
    <div class="command-center">
      <!-- 左侧：快速加分按钮组 -->
      <div class="quick-actions-panel">
        <div class="panel-header">
          <span class="panel-icon">⚡</span>
          <span class="panel-title">快速加分</span>
        </div>
        <div class="quick-btns-grid">
          <button 
            v-for="action in quickActions" 
            :key="action.id"
            class="quick-action-btn"
            :class="action.color"
            @click="quickAddPoints(action)"
            :disabled="!selectedChildId"
          >
            <span class="action-emoji">{{ action.emoji }}</span>
            <span class="action-name">{{ action.name }}</span>
            <span class="action-points" :class="{ 'score-pop': poppingScore === action.id }">+{{ action.points }}</span>
          </button>
        </div>
        <div class="child-select-bar">
          <label>👶 选择孩子：</label>
          <select v-model="selectedChildId" v-if="children.length > 1">
            <option v-for="child in children" :key="child.id" :value="child.id">
              {{ child.avatar || '👶' }} {{ child.name }} ({{ child.current_balance }}分)
            </option>
          </select>
          <span v-else-if="children.length === 1" class="single-child">
            {{ children[0].avatar || '👶' }} {{ children[0].name }}
          </span>
          <span v-else class="no-child">请先添加孩子</span>
        </div>
        
        <!-- 新增行为按钮 -->
        <div class="add-behavior-bar">
          <button class="btn btn-success add-behavior-btn" @click="showAddBehaviorModal = true" :disabled="!selectedChildId">
            <span>➕ 新增行为记录</span>
          </button>
        </div>
      </div>
      
      <!-- 右侧：待办事项窗口 -->
      <div class="todo-panel">
        <div class="panel-header">
          <span class="panel-icon">📋</span>
          <span class="panel-title">待办事项</span>
          <span class="todo-count" v-if="pendingTasks.length > 0">{{ pendingTasks.length }}</span>
        </div>
        <div class="todo-list">
          <div v-if="pendingTasks.length === 0" class="todo-empty">
            <span class="empty-emoji">🎉</span>
            <p>太棒了！没有待办事项</p>
          </div>
          <div 
            v-for="task in pendingTasks" 
            :key="task.id"
            class="todo-item"
            @click="reviewTask(task)"
          >
            <span class="todo-icon">{{ task.icon || '📋' }}</span>
            <div class="todo-info">
              <span class="todo-title">{{ task.title }}</span>
              <span class="todo-assignee">
                {{ task.children?.map(c => c.name).join(', ') || '未分配' }}
              </span>
            </div>
            <span class="todo-points">+{{ task.points }}</span>
          </div>
        </div>
      </div>
    </div>
    
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
          <div class="number" :class="{ 'score-scale': isScalingScore }">{{ stats.totalPointsEarned }}</div>
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
    
    <!-- 消息提示 -->
    <div v-if="recordMessage" :class="['record-toast', recordMessage.type]">
      <span class="toast-icon">{{ recordMessage.type === 'success' ? '✅' : '❌' }}</span>
      <span class="toast-text">{{ recordMessage.text }}</span>
    </div>
    
    <!-- 新增行为弹窗 -->
    <div v-if="showAddBehaviorModal" class="modal-overlay" @click.self="showAddBehaviorModal = false">
      <div class="modal behavior-modal">
        <div class="modal-header">
          <h3>➕ 新增行为记录</h3>
          <button class="close-btn" @click="showAddBehaviorModal = false">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>选择行为</label>
            <div class="behavior-grid">
              <button 
                v-for="rule in goodRules" 
                :key="rule.id"
                class="behavior-option"
                :class="{ active: selectedBehavior?.id === rule.id }"
                @click="selectedBehavior = rule"
              >
                <span class="behavior-emoji">{{ rule.icon || '⭐' }}</span>
                <span class="behavior-name">{{ rule.name }}</span>
                <span class="behavior-points">+{{ rule.points }}</span>
              </button>
            </div>
          </div>
          <div class="form-group">
            <label>备注（可选）</label>
            <input v-model="behaviorNote" type="text" placeholder="添加备注...">
          </div>
          <div v-if="linkedTasks.length > 0" class="linked-tasks">
            <label>📋 关联任务（将自动完成）</label>
            <div class="task-list">
              <div v-for="task in linkedTasks" :key="task.id" class="linked-task-item">
                <span class="task-icon">{{ task.icon || '📋' }}</span>
                <span class="task-title">{{ task.title }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-secondary" @click="showAddBehaviorModal = false">取消</button>
          <button class="btn btn-primary" @click="addBehavior" :disabled="!selectedBehavior || addingBehavior">
            <span v-if="addingBehavior">保存中...</span>
            <span v-else>确认记录</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick, reactive, computed } from 'vue'
import * as echarts from 'echarts'
import { supabase, subscribeToTable } from '../utils/supabase.js'

const trendChart = ref(null)
const pieChart = ref(null)
const isRefreshing = ref(false)
const isScalingScore = ref(false)
const poppingScore = ref(null)

const stats = reactive({
  totalChildren: 0,
  totalPointsEarned: 0,
  todayTransactions: 0,
  activeRules: 0
})

const children = ref([])
const goodRules = ref([])
const recentTransactions = ref([])
const tasks = ref([])
const selectedChildId = ref('')
const recordMessage = ref(null)

// 新增行为弹窗状态
const showAddBehaviorModal = ref(false)
const selectedBehavior = ref(null)
const behaviorNote = ref('')
const addingBehavior = ref(false)

// 关联的任务
const linkedTasks = computed(() => {
  if (!selectedBehavior.value || !selectedChildId.value) return []
  return tasks.value.filter(t => 
    t.task_type === 'single' && 
    t.status === 'active' &&
    t.title?.includes(selectedBehavior.value.name)
  )
})

// 快速加分操作
const quickActions = [
  { id: 'wake_up', name: '按时起床', emoji: '🌅', points: 5, color: 'sunrise' },
  { id: 'homework', name: '完成作业', emoji: '📝', points: 10, color: 'ocean' },
  { id: 'reading', name: '阅读时光', emoji: '📚', points: 8, color: 'purple' },
  { id: 'housework', name: '做家务', emoji: '🧹', points: 6, color: 'leaf' },
  { id: 'exercise', name: '运动锻炼', emoji: '⚽', points: 7, color: 'fire' },
  { id: 'kindness', name: '帮助他人', emoji: '💝', points: 5, color: 'love' }
]

// 待办任务（未完成的任务）
const pendingTasks = computed(() => {
  return tasks.value.filter(t => t.status !== 'completed').slice(0, 5)
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
  
  // 自动选择第一个孩子
  if (children.value.length > 0 && !selectedChildId.value) {
    selectedChildId.value = children.value[0].id
  }
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

// 加载任务
async function loadTasks() {
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10)
  
  // 获取任务分配的孩子（从 task_progress 表）
  const tasksWithChildren = await Promise.all(
    (tasksData || []).map(async (task) => {
      const { data: progress } = await supabase
        .from('task_progress')
        .select('child_id, children(name, avatar)')
        .eq('task_id', task.id)
      
      return {
        ...task,
        children: progress?.map(p => ({
          id: p.child_id,
          name: p.children?.name,
          avatar: p.children?.avatar
        })) || []
      }
    })
  )
  
  tasks.value = tasksWithChildren
}

// 快速加分
async function quickAddPoints(action) {
  if (!selectedChildId.value) {
    recordMessage.value = { type: 'error', text: '请先选择孩子' }
    setTimeout(() => recordMessage.value = null, 3000)
    return
  }

  // 动画效果
  poppingScore.value = action.id
  setTimeout(() => poppingScore.value = null, 300)
  isScalingScore.value = true
  setTimeout(() => isScalingScore.value = false, 300)

  const child = children.value.find(c => c.id === selectedChildId.value)
  
  // 创建交易记录
  const { error } = await supabase.from('transactions').insert({
    child_id: selectedChildId.value,
    points: action.points,
    type: 'earn',
    note: action.name,
    rule_id: null
  })

  if (error) {
    recordMessage.value = { type: 'error', text: '记录失败: ' + error.message }
  } else {
    recordMessage.value = { 
      type: 'success', 
      text: `✨ ${child?.name} ${action.name} +${action.points}分！`
    }
    await refreshData()
  }
  
  setTimeout(() => recordMessage.value = null, 3000)
}

// 新增行为记录
async function addBehavior() {
  if (!selectedChildId.value || !selectedBehavior.value) return
  
  addingBehavior.value = true
  const child = children.value.find(c => c.id === selectedChildId.value)
  
  try {
    // 1. 创建交易记录
    const { data: tx, error: txError } = await supabase.from('transactions').insert({
      child_id: selectedChildId.value,
      points: selectedBehavior.value.points,
      type: 'earn',
      note: behaviorNote.value || selectedBehavior.value.name,
      rule_id: selectedBehavior.value.id
    }).select().single()
    
    if (txError) throw txError
    
    // 2. 检查并更新关联的任务进度
    for (const task of linkedTasks.value) {
      // 获取任务进度
      const { data: progress } = await supabase
        .from('task_progress')
        .select('*')
        .eq('task_id', task.id)
        .eq('child_id', selectedChildId.value)
        .single()
      
      if (progress && progress.status !== 'completed') {
        // 更新为已完成
        await supabase.from('task_progress').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_count: (progress.current_count || 0) + 1
        }).eq('id', progress.id)
        
        // 更新任务状态
        await supabase.from('tasks').update({
          status: 'completed'
        }).eq('id', task.id)
      }
    }
    
    recordMessage.value = { 
      type: 'success', 
      text: `✨ ${child?.name} ${selectedBehavior.value.name} +${selectedBehavior.value.points}分！${linkedTasks.value.length > 0 ? '（任务已同步完成）' : ''}`
    }
    
    // 重置弹窗
    showAddBehaviorModal.value = false
    selectedBehavior.value = null
    behaviorNote.value = ''
    
    await refreshData()
  } catch (error) {
    console.error('新增行为失败:', error)
    recordMessage.value = { type: 'error', text: '记录失败: ' + error.message }
  } finally {
    addingBehavior.value = false
    setTimeout(() => recordMessage.value = null, 3000)
  }
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

// 刷新数据
async function refreshData() {
  isRefreshing.value = true
  try {
    await Promise.all([
      loadStats(),
      loadChildren(),
      loadRules(),
      loadTransactions(),
      loadTasks()
    ])
    console.log('✅ 数据刷新完成')
  } catch (error) {
    console.error('❌ 刷新数据失败:', error)
  } finally {
    isRefreshing.value = false
  }
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
    subscribeToTable('transactions', (payload) => {
      console.log('🔄 收到transactions更新:', payload)
      loadTransactions()
      loadStats()
      loadChildren()
    })
  )
  
  subscriptions.push(
    subscribeToTable('children', (payload) => {
      console.log('🔄 收到children更新:', payload)
      loadChildren()
      loadStats()
    })
  )
  
  subscriptions.push(
    subscribeToTable('tasks', (payload) => {
      console.log('🔄 收到tasks更新:', payload)
      loadTasks()
    })
  )
})

onUnmounted(() => {
  subscriptions.forEach(sub => {
    if (sub && typeof sub.unsubscribe === 'function') {
      sub.unsubscribe()
    }
  })
  trendChartInstance?.dispose()
  pieChartInstance?.dispose()
})
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  color: #333;
  font-size: 1.8rem;
}

.refresh-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 600;
  font-size: 1rem;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);
}

.refresh-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
}

.refresh-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* 快捷操作台 - Grid布局 */
.command-center {
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (max-width: 1024px) {
  .command-center {
    grid-template-columns: 1fr;
  }
}

.quick-actions-panel, .todo-panel {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.panel-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.panel-title {
  font-size: 1.2rem;
  font-weight: 700;
  color: #333;
  flex: 1;
}

.todo-count {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.1); }
}

/* 快速加分按钮网格 */
.quick-btns-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.quick-action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 8px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 8px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
}

.quick-action-btn:hover:not(:disabled) {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

.quick-action-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 颜色主题 */
.quick-action-btn.sunrise {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.quick-action-btn.ocean {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.quick-action-btn.purple {
  background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%);
}

.quick-action-btn.leaf {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
}

.quick-action-btn.fire {
  background: linear-gradient(135deg, #fa709a 0%, #ff6b6b 100%);
}

.quick-action-btn.love {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
}

.action-emoji {
  font-size: 2rem;
}

.action-name {
  font-size: 0.85rem;
  color: white;
  font-weight: 600;
  text-shadow: 0 1px 2px rgba(0,0,0,0.2);
}

.action-points {
  font-size: 1.1rem;
  color: white;
  font-weight: 700;
  background: rgba(255,255,255,0.3);
  padding: 4px 12px;
  border-radius: 20px;
  transition: transform 0.15s;
}

/* 分数弹动动画 */
.score-pop {
  animation: scorePop 0.3s ease-out;
}

@keyframes scorePop {
  0% { transform: scale(1); }
  50% { transform: scale(1.5); }
  100% { transform: scale(1); }
}

.score-scale {
  animation: scoreScale 0.3s ease-out;
}

@keyframes scoreScale {
  0% { transform: scale(1); }
  50% { transform: scale(1.2); }
  100% { transform: scale(1); }
}

/* 孩子选择栏 */
.child-select-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.child-select-bar label {
  font-weight: 600;
  color: #495057;
}

.child-select-bar select {
  flex: 1;
  padding: 10px 16px;
  border: 2px solid #dee2e6;
  border-radius: 10px;
  font-size: 1rem;
  background: white;
  cursor: pointer;
}

.child-select-bar select:focus {
  border-color: #667eea;
  outline: none;
}

.single-child {
  flex: 1;
  font-weight: 600;
  color: #333;
  padding: 10px 16px;
  background: #e7f3ff;
  border-radius: 10px;
}

.no-child {
  flex: 1;
  color: #868e96;
}

/* 待办事项列表 */
.todo-list {
  max-height: 320px;
  overflow-y: auto;
}

.todo-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px;
  color: #868e96;
}

.empty-emoji {
  font-size: 3rem;
  margin-bottom: 12px;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.todo-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.todo-item:hover {
  background: #e7f3ff;
  transform: translateX(4px);
}

.todo-icon {
  font-size: 1.5rem;
  width: 44px;
  height: 44px;
  background: white;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.todo-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.todo-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.todo-assignee {
  font-size: 0.85rem;
  color: #868e96;
}

.todo-points {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.9rem;
}

/* 消息提示 */
.record-toast {
  position: fixed;
  bottom: 30px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 28px;
  border-radius: 12px;
  font-weight: 600;
  box-shadow: 0 8px 30px rgba(0,0,0,0.2);
  animation: slideUp 0.3s ease-out;
  z-index: 9999;
}

@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateX(-50%) translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateX(-50%) translateY(0);
  }
}

.record-toast.success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.record-toast.error {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
}

.toast-icon {
  font-size: 1.3rem;
}

/* 图表区域 */
.charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 24px;
}

.chart {
  height: 300px;
}

/* 新增行为按钮 */
.add-behavior-bar {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.add-behavior-btn {
  width: 100%;
  padding: 12px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
}

.add-behavior-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(17, 153, 142, 0.4);
}

.add-behavior-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* 行为弹窗 */
.behavior-modal {
  max-width: 500px;
}

.behavior-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.behavior-option {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 12px;
  background: #f8f9fa;
  border: 2px solid transparent;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
}

.behavior-option:hover {
  background: #e9ecef;
}

.behavior-option.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.behavior-emoji {
  font-size: 2rem;
  margin-bottom: 8px;
}

.behavior-name {
  font-size: 0.95rem;
  font-weight: 500;
  margin-bottom: 4px;
}

.behavior-points {
  font-size: 0.85rem;
  opacity: 0.8;
}

.behavior-option.active .behavior-points {
  color: #ffd43b;
  font-weight: 600;
}

.linked-tasks {
  margin-top: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
}

.linked-tasks label {
  display: block;
  margin-bottom: 12px;
  font-weight: 600;
  color: #495057;
}

.linked-task-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
}

.task-icon {
  font-size: 1.2rem;
}

.task-title {
  font-size: 0.95rem;
  color: #333;
}

@media (max-width: 768px) {
  .behavior-grid {
    grid-template-columns: 1fr;
  }
}
</style>
