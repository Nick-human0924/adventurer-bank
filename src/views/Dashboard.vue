<template>
  <div class="dashboard">
    <!-- 页面标题和刷新按钮 -->
    <div class="page-header">
      <h2 class="page-title">🏦 {{ bankTitle }}</h2>
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
              {{ child.name }} ({{ getVisibleBalance(child.id) }}💰 {{ child.gem_balance || 0 }}💎)
            </option>
          </select>
          <span v-else-if="children.length === 1" class="single-child">
            {{ children[0].name }} ({{ getVisibleBalance(children[0].id) }}💰 {{ children[0].gem_balance || 0 }}💎)
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
            <span class="todo-points">
              <span v-if="task.reward_points > 0">+{{ task.reward_points }}💰</span>
              <span v-if="task.reward_gems > 0">+{{ task.reward_gems }}💎</span>
            </span>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 新增：数据可视化图表区域 -->
    <div class="charts-section" v-if="selectedChildId">
      <div class="charts-grid">
        <TrendChart :childId="selectedChildId" :currentBalance="getVisibleBalance(selectedChildId)" />
        <RadarChart :childId="selectedChildId" />
      </div>
      <HeatmapChart :childId="selectedChildId" class="heatmap-full" />
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
          <h3>总金币发放</h3>
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
    
    <!-- 最近行为记录 -->
    <div class="card">
      <div class="card-title" style="display: flex; justify-content: space-between; align-items: center;">
        <span>📝 最近行为记录</span>
        <div class="batch-actions" v-if="selectedTransactions.length > 0">
          <span class="selected-count">已选 {{ selectedTransactions.length }} 条</span>
          <button class="btn btn-danger" @click="batchDeleteTransactions">
            🗑️ 批量删除
          </button>
          <button class="btn btn-secondary" @click="selectedTransactions = []">
            取消
          </button>
        </div>
      </div>
      
      <!-- 筛选栏 -->
      <div class="filter-bar">
        <div class="filter-group">
          <label>孩子</label>
          <select v-model="filterChildId">
            <option value="">全部孩子</option>
            <option v-for="child in children" :key="child.id" :value="child.id">
              {{ child.avatar || '👶' }} {{ child.name }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label>类型</label>
          <select v-model="filterType">
            <option value="">全部类型</option>
            <option value="earn">获得金币</option>
            <option value="spend">消费金币</option>
          </select>
        </div>
        <div class="filter-group">
          <label>从</label>
          <input v-model="filterDateFrom" type="date">
        </div>
        <div class="filter-group">
          <label>至</label>
          <input v-model="filterDateTo" type="date">
        </div>
        <button class="btn btn-secondary filter-reset-btn" @click="resetFilters">
          重置筛选
        </button>
      </div>
      
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th v-if="filteredTransactions.length > 0">
                <input 
                  type="checkbox" 
                  :checked="isAllSelected"
                  @change="toggleSelectAll"
                />
              </th>
              <th>时间</th>
              <th>孩子</th>
              <th>行为</th>
              <th>金币</th>
              <th>分类</th>
              <th>备注</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="tx in filteredTransactions" :key="tx.id">
              <td>
                <input 
                  type="checkbox" 
                  :value="tx.id"
                  v-model="selectedTransactions"
                />
              </td>
              <td>{{ formatDate(tx.created_at) }}</td>
              <td>{{ tx.child_name }}</td>
              <td>{{ tx.rule_name }}</td>
              <td :class="tx.type === 'earn' ? 'text-success' : 'text-danger'">
                {{ tx.type === 'earn' ? '+' : '-' }}{{ tx.points }}
              </td>
              <td>
                <span :class="['badge', 'badge-category']">
                  {{ getCategoryFromNote(tx.note) }}
                </span>
              </td>
              <td>{{ tx.note || '-' }}</td>
              <td>
                <button class="btn-icon delete" @click="deleteTransaction(tx)" title="删除">
                  🗑️
                </button>
              </td>
            </tr>
            <tr v-if="filteredTransactions.length === 0">
              <td colspan="8" class="no-data">没有找到匹配的记录</td>
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
            <label>选择行为（可多选）</label>
            <div class="behavior-categories">
              <div v-for="(rules, category) in rulesByCategory" :key="category" class="behavior-category">
                <div class="category-header">{{ category }}</div>
                <div class="behavior-grid">
                  <button 
                    v-for="rule in rules" 
                    :key="rule.id"
                    class="behavior-option"
                    :class="{ 
                      active: selectedBehaviors.some(b => b.id === rule.id),
                      'negative': rule.type === 'bad'
                    }"
                    @click="toggleBehavior(rule)"
                  >
                    <span class="behavior-emoji">{{ rule.icon || rule.icon_emoji || '⭐' }}</span>
                    <span class="behavior-name">{{ rule.name }}</span>
                    <span class="behavior-points" :class="rule.type">{{ rule.type === 'bad' ? '-' : '+' }}{{ rule.points }}</span>
                    <span v-if="selectedBehaviors.some(b => b.id === rule.id)" class="check-mark">✓</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div class="form-row">
            <div class="form-group half">
              <label>日期</label>
              <input v-model="behaviorDate" type="date" :max="today" class="date-input">
            </div>
            <div class="form-group half">
              <label>时间</label>
              <input v-model="behaviorTime" type="time" class="time-input">
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
          <button class="btn btn-primary" @click="addBehavior" :disabled="selectedBehaviors.length === 0 || addingBehavior">
            <span v-if="addingBehavior">保存中...</span>
            <span v-else>确认记录 ({{ selectedBehaviors.length }})</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, computed } from 'vue'
import { supabase, subscribeToTable } from '../utils/supabase.js'

// v4.0 新增图表组件
import TrendChart from '../components/charts/TrendChart.vue'
import RadarChart from '../components/charts/RadarChart.vue'
import HeatmapChart from '../components/charts/HeatmapChart.vue'

const isRefreshing = ref(false)
const isScalingScore = ref(false)
const poppingScore = ref(null)
const userName = ref('')

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

// 选中的交易记录（用于批量删除）
const selectedTransactions = ref([])

// 是否全选
const isAllSelected = computed(() => {
  return filteredTransactions.value.length > 0 && 
         selectedTransactions.value.length === filteredTransactions.value.length
})

// 切换全选
function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedTransactions.value = []
  } else {
    selectedTransactions.value = filteredTransactions.value.map(tx => tx.id)
  }
}

// 删除单条交易记录
async function deleteTransaction(tx) {
  if (!confirm(`确定要删除这条行为记录吗？\n\n${tx.child_name} - ${tx.rule_name} ${tx.type === 'earn' ? '+' : '-'}${tx.points}金币`)) {
    return
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')
    
    // 1. 删除交易记录（只按ID删除，RLS策略会控制权限）
    const { error: txError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', tx.id)
    
    if (txError) throw txError
    
    // 2. 更新孩子金币（回退）
    const pointChange = tx.type === 'earn' ? -tx.points : tx.points
    const { data: child } = await supabase
      .from('children')
      .select('current_balance, total_points')
      .eq('id', tx.child_id)
      .single()
    
    if (child) {
      await supabase
        .from('children')
        .update({
          current_balance: Math.max(0, child.current_balance + pointChange),
          total_points: Math.max(0, child.total_points + pointChange)
        })
        .eq('id', tx.child_id)
    }
    
    recordMessage.value = { type: 'success', text: '✅ 记录已删除，金币已回退' }
    await refreshData()
  } catch (error) {
    console.error('删除记录失败:', error)
    recordMessage.value = { type: 'error', text: '删除失败: ' + error.message }
  }
  
  setTimeout(() => recordMessage.value = null, 3000)
}

// 批量删除交易记录
async function batchDeleteTransactions() {
  if (selectedTransactions.value.length === 0) return
  
  if (!confirm(`确定要删除选中的 ${selectedTransactions.value.length} 条行为记录吗？\n\n此操作不可恢复，孩子的金币将相应回退。`)) {
    return
  }
  
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('未登录')
    
    // 获取要删除的记录详情
    const { data: txsToDelete } = await supabase
      .from('transactions')
      .select('*')
      .in('id', selectedTransactions.value)
    
    // 按孩子分组计算金币变化
    const childBalanceChanges = {}
    for (const tx of (txsToDelete || [])) {
      if (!childBalanceChanges[tx.child_id]) {
        childBalanceChanges[tx.child_id] = { current: 0, total: 0 }
      }
      const change = tx.type === 'earn' ? -tx.points : tx.points
      childBalanceChanges[tx.child_id].current += change
      childBalanceChanges[tx.child_id].total += change
    }
    
    // 删除交易记录
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .in('id', selectedTransactions.value)
    
    if (deleteError) throw deleteError
    
    // 更新每个孩子的金币
    for (const [childId, changes] of Object.entries(childBalanceChanges)) {
      const { data: child } = await supabase
        .from('children')
        .select('current_balance, total_points')
        .eq('id', childId)
        .single()
      
      if (child) {
        await supabase
          .from('children')
          .update({
            current_balance: Math.max(0, child.current_balance + changes.current),
            total_points: Math.max(0, child.total_points + changes.total)
          })
          .eq('id', childId)
      }
    }
    
    selectedTransactions.value = []
    recordMessage.value = { type: 'success', text: `✅ 已删除 ${txsToDelete?.length || 0} 条记录，金币已回退` }
    await refreshData()
  } catch (error) {
    console.error('批量删除失败:', error)
    recordMessage.value = { type: 'error', text: '批量删除失败: ' + error.message }
  }
  
  setTimeout(() => recordMessage.value = null, 3000)
}

// 银行标题
const bankTitle = computed(() => {
  if (children.value.length === 1) {
    return `${children.value[0].name}的行为银行`
  } else if (children.value.length > 1) {
    return `${userName.value || '我'}的行为银行`
  }
  return '行为银行'
})

// 新增行为弹窗状态
const showAddBehaviorModal = ref(false)
const selectedBehaviors = ref([])  // 改为数组支持多选
const behaviorNote = ref('')
const addingBehavior = ref(false)

// 日期时间选择状态（默认当前日期时间 - 本地时区）
const behaviorDate = ref((() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})())
const behaviorTime = ref(new Date().toTimeString().slice(0, 5))

// 日期选择器的max属性（今天 - 本地时区）
const today = computed(() => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
})

// 筛选状态
const filterChildId = ref('')
const filterType = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')

// 重置筛选条件
function resetFilters() {
  filterChildId.value = ''
  filterType.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
}

// 筛选后的交易记录
const filteredTransactions = computed(() => {
  return recentTransactions.value.filter(tx => {
    // 筛选孩子
    if (filterChildId.value && tx.child_id !== filterChildId.value) {
      return false
    }
    // 筛选类型
    if (filterType.value && tx.type !== filterType.value) {
      return false
    }
    // 筛选日期范围
    const txDate = tx.created_at.split('T')[0]
    if (filterDateFrom.value && txDate < filterDateFrom.value) {
      return false
    }
    if (filterDateTo.value && txDate > filterDateTo.value) {
      return false
    }
    return true
  })
})

// 获取孩子可见余额（基于当前筛选的交易记录）
function getVisibleBalance(childId) {
  // 直接使用数据库中的 current_balance，确保准确性
  const child = children.value.find(c => c.id === childId)
  return child?.current_balance || 0
}

// 按分类分组的规则
const rulesByCategory = computed(() => {
  const grouped = {}
  goodRules.value.forEach(rule => {
    const category = rule.category || '其他'
    if (!grouped[category]) {
      grouped[category] = []
    }
    grouped[category].push(rule)
  })
  return grouped
})

// 切换选择行为（多选）
function toggleBehavior(rule) {
  const index = selectedBehaviors.value.findIndex(b => b.id === rule.id)
  if (index > -1) {
    selectedBehaviors.value.splice(index, 1)
  } else {
    selectedBehaviors.value.push(rule)
  }
}

// 关联的任务
const linkedTasks = computed(() => {
  if (selectedBehaviors.value.length === 0 || !selectedChildId.value) return []
  const behaviorIds = selectedBehaviors.value.map(b => b.id)
  return tasks.value.filter(t => 
    t.linked_rule_ids?.some(id => behaviorIds.includes(id))
  )
})

// 快速加分操作 - 从数据库规则动态生成
const quickActions = computed(() => {
  // 优先使用数据库中的good规则，最多显示6个
  const rules = goodRules.value.slice(0, 6)
  if (rules.length === 0) {
    // 如果没有规则，返回空数组
    return []
  }
  // 映射规则为快速操作按钮
  const colorMap = ['sunrise', 'ocean', 'purple', 'leaf', 'fire', 'love']
  return rules.map((rule, index) => ({
    id: rule.id,
    name: rule.name,
    emoji: rule.icon_emoji || rule.icon || '⭐',
    points: rule.points,
    color: colorMap[index % colorMap.length],
    rule_id: rule.id
  }))
})

// 待办任务（未完成的任务）
const pendingTasks = computed(() => {
  return tasks.value.filter(t => t.status !== 'completed').slice(0, 5)
})

let subscriptions = []

// 加载统计数据
async function loadStats() {
  // 总孩子数
  const { count: childCount } = await supabase
    .from('children')
    .select('*', { count: 'exact', head: true })
  stats.totalChildren = childCount || 0

  // 总金币发放
  const { data: earnedData } = await supabase
    .from('transactions')
    .select('points')
    .eq('type', 'earn')
  stats.totalPointsEarned = earnedData?.reduce((sum, t) => sum + t.points, 0) || 0

  // 今日交易（使用本地时区）
  const todayDate = new Date()
  const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
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
  console.log('🔄 Dashboard: 开始加载孩子...')
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError) {
    console.error('❌ Dashboard: 获取用户失败:', userError)
    return
  }
  
  if (!user) {
    console.error('❌ Dashboard: 用户未登录')
    return
  }
  
  console.log('🔄 Dashboard: 加载孩子，用户ID:', user.id)
  
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('name')
  
  if (error) {
    console.error('❌ Dashboard: 加载孩子失败:', error)
    return
  }
  
  console.log('📊 Dashboard: 查询到', data?.length || 0, '个孩子')
  
  // 如果没有孩子，直接返回
  if (!data || data.length === 0) {
    children.value = []
    console.log('⚠️ Dashboard: 没有孩子数据')
    return
  }
  
  // 批量获取所有孩子的交易记录（一次性查询）
  const childIds = data.map(c => c.id)
  let transactionsMap = {}
  
  const { data: allTransactions, error: txError } = await supabase
    .from('transactions')
    .select('child_id, type, points')
    .in('child_id', childIds)
  
  if (txError) {
    console.error('❌ Dashboard: 加载交易记录失败:', txError)
  }
  
  // 按孩子ID分组
  allTransactions?.forEach(tx => {
    if (!transactionsMap[tx.child_id]) {
      transactionsMap[tx.child_id] = { earned: 0, spent: 0 }
    }
    if (tx.type === 'earn') {
      transactionsMap[tx.child_id].earned += tx.points
    } else {
      transactionsMap[tx.child_id].spent += tx.points
    }
  })
  
  // 合并数据 - 优先使用数据库的 current_balance，不一致时记录日志
  const childrenWithBalance = data.map(child => {
    const tx = transactionsMap[child.id] || { earned: 0, spent: 0 }
    const calculatedBalance = tx.earned - tx.spent
    const dbBalance = child.current_balance || 0

    // 如果数据库余额与计算余额差异超过0.01，说明有未记录的变动（如兑换）
    if (Math.abs(dbBalance - calculatedBalance) > 0.01) {
      console.log(`⚠️ 余额不一致 ${child.name}: 数据库=${dbBalance}, 计算=${calculatedBalance}, 使用数据库值`)
    }

    return {
      ...child,
      current_balance: dbBalance  // 优先使用数据库值
    }
  })
  
  children.value = childrenWithBalance
  console.log('✅ Dashboard: 加载到', children.value.length, '个孩子')
  children.value.forEach(c => {
    console.log(`  - ${c.name}: ${c.current_balance}金币, ${c.gem_balance || 0}宝石`)
  })
  
  // 自动选择第一个孩子
  if (children.value.length > 0 && !selectedChildId.value) {
    selectedChildId.value = children.value[0].id
  }
  
  // 获取用户信息（用于多孩子时的标题）
  if (user?.user_metadata?.name) {
    userName.value = user.user_metadata.name
  } else if (user?.email) {
    userName.value = user.email.split('@')[0]
  }
}

// 加载规则
async function loadRules() {
  console.log('🔄 Dashboard: 开始加载规则...')
  
  const { data, error } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)
    .order('type', { ascending: false })  // good 在前，bad 在后
    .order('name')
  
  if (error) {
    console.error('❌ Dashboard: 加载规则失败:', error)
    goodRules.value = []
    return
  }
  
  goodRules.value = data || []
  console.log('✅ Dashboard: 加载到', goodRules.value.length, '条规则')
}

// 加载交易记录
async function loadTransactions() {
  console.log('🔄 Dashboard: 开始加载交易记录...')
  
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  if (userError) {
    console.error('❌ Dashboard: 获取用户失败:', userError)
    return
  }
  if (!user) {
    console.error('❌ Dashboard: 用户未登录')
    return
  }
  
  // 获取当前用户的所有孩子ID
  const { data: userChildren, error: childrenError } = await supabase
    .from('children')
    .select('id')
    .eq('user_id', user.id)
  
  if (childrenError) {
    console.error('❌ Dashboard: 查询孩子ID失败:', childrenError)
    recentTransactions.value = []
    return
  }
  
  const childIds = userChildren?.map(c => c.id) || []
  console.log('📊 Dashboard: 查询交易，孩子IDs:', childIds)
  
  if (childIds.length === 0) {
    console.log('⚠️ Dashboard: 没有孩子，交易记录为空')
    recentTransactions.value = []
    return
  }
  
  const { data, error: txError } = await supabase
    .from('transactions')
    .select(`
      *,
      children(name),
      rules(name, icon, category)
    `)
    .in('child_id', childIds)
    .order('created_at', { ascending: false })
    .limit(20)
  
  if (txError) {
    console.error('❌ Dashboard: 加载交易记录失败:', txError)
    recentTransactions.value = []
    return
  }
  
  console.log('📊 Dashboard: 查询到', data?.length || 0, '条交易记录')
  
  recentTransactions.value = (data || []).map(t => ({
    ...t,
    child_name: t.children?.name,
    rule_name: t.rules?.name || t.note || '-',
    rule_icon: t.rules?.icon,
    rule_category: t.rules?.category || '其他'
  }))
  
  console.log('✅ Dashboard: 加载交易记录完成')
}

// 加载任务
async function loadTasks() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.error('❌ Dashboard: 加载任务时用户未登录')
    return
  }
  
  console.log('🔄 Dashboard: 加载任务，用户ID:', user.id)
  
  const { data: tasksData, error: tasksError } = await supabase
    .from('tasks')
    .select('*')
    .eq('user_id', user.id)
    .neq('status', 'completed')
    .order('created_at', { ascending: false })
    .limit(10)
  
  if (tasksError) {
    console.error('❌ Dashboard: 加载任务失败:', tasksError)
    tasks.value = []
    return
  }
  
  console.log('📊 Dashboard: 查询到', tasksData?.length || 0, '个任务')
  
  if (!tasksData || tasksData.length === 0) {
    tasks.value = []
    return
  }
  
  // 获取任务分配的孩子（从 task_progress 表，带 user_id 过滤）
  const tasksWithChildren = await Promise.all(
    tasksData.map(async (task) => {
      const { data: progress, error: progressError } = await supabase
        .from('task_progress')
        .select('child_id, children(name, avatar)')
        .eq('task_id', task.id)
        .eq('user_id', user.id)
      
      if (progressError) {
        console.error(`❌ Dashboard: 加载任务${task.id}的进度失败:`, progressError)
      }
      
      const childrenList = progress?.map(p => ({
        id: p.child_id,
        name: p.children?.name || '未知',
        avatar: p.children?.avatar || '👶'
      })) || []
      
      return {
        ...task,
        children: childrenList
      }
    })
  )
  
  tasks.value = tasksWithChildren
  console.log('✅ Dashboard: 加载到', tasks.value.length, '个任务')
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
    note: action.name + ' 小艺代填',
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
  if (!selectedChildId.value || selectedBehaviors.value.length === 0) return
  
  addingBehavior.value = true
  const child = children.value.find(c => c.id === selectedChildId.value)
  
  try {
    // 组合日期和时间
    const dateTimeStr = `${behaviorDate.value}T${behaviorTime.value}:00`
    const createdAt = new Date(dateTimeStr).toISOString()
    
    let totalPoints = 0
    const behaviorNames = []
    
    // 1. 批量创建交易记录
    for (const behavior of selectedBehaviors.value) {
      const isBadBehavior = behavior.type === 'bad'
      const { error: txError } = await supabase.from('transactions').insert({
        child_id: selectedChildId.value,
        points: behavior.points,
        type: isBadBehavior ? 'spend' : 'earn',
        note: (behaviorNote.value || behavior.name) + ' 小艺代填',
        rule_id: behavior.id,
        created_at: createdAt
      })
      
      if (txError) throw txError
      
      totalPoints += isBadBehavior ? -behavior.points : behavior.points
      behaviorNames.push(behavior.name)
    }
    
    // 2. 检查并更新关联的任务进度（使用本地时区）
    const todayDate = new Date()
    const today = `${todayDate.getFullYear()}-${String(todayDate.getMonth() + 1).padStart(2, '0')}-${String(todayDate.getDate()).padStart(2, '0')}`
    
    for (const task of linkedTasks.value) {
      let { data: progress } = await supabase
        .from('task_progress')
        .select('*')
        .eq('task_id', task.id)
        .eq('child_id', selectedChildId.value)
        .single()
      
      // 如果没有进度记录，创建新记录
      if (!progress) {
        const { data: newProgress, error: createError } = await supabase
          .from('task_progress')
          .insert({
            task_id: task.id,
            child_id: selectedChildId.value,
            user_id: user.id,
            combo_progress: {},
            completion_history: [],
            current_count: 0,
            streak_count: 0,
            status: 'active'
          })
          .select()
          .single()
        
        if (createError) {
          console.error('创建任务进度失败:', createError)
          continue
        }
        progress = newProgress
      }
      
      if (progress.status === 'completed') continue
      
      // 组合任务：更新 combo_progress
      if (task.task_type === 'combo' && task.linked_rule_ids && task.linked_rule_ids.length > 0) {
        const currentComboProgress = { ...(progress.combo_progress || {}) }
        
        // 记录每个完成的规则
        for (const behavior of selectedBehaviors.value) {
          if (task.linked_rule_ids.includes(behavior.id)) {
            currentComboProgress[behavior.id] = {
              date: today,
              completed: true
            }
          }
        }
        
        // 检查当天是否完成了所有要求的规则
        const completedRulesToday = Object.values(currentComboProgress).filter(
          data => data.date === today && data.completed === true
        ).length
        
        // 只有当完成了所有关联规则，才算完成一次
        const allRulesCompleted = completedRulesToday >= task.linked_rule_ids.length
        
        // 计算新的完成次数（只有完成所有规则才算一次）
        const currentCount = progress.current_count || 0
        const newCount = allRulesCompleted ? currentCount + 1 : currentCount
        
        // 检查是否达到目标次数
        const targetCount = task.target_count || 7
        const isCompleted = newCount >= targetCount
        
        console.log(`📝 组合任务 ${task.title}: 今日完成${completedRulesToday}/${task.linked_rule_ids.length}个规则, 总进度${newCount}/${targetCount}, 完成:${isCompleted}`)
        
        // 更新任务进度
        await supabase.from('task_progress').update({
          combo_progress: currentComboProgress,
          current_count: newCount,
          status: isCompleted ? 'completed' : 'active'
        }).eq('id', progress.id)
        
        // 如果任务完成，更新任务状态
        if (isCompleted && progress.status !== 'completed') {
          await supabase.from('tasks').update({
            status: 'completed'
          }).eq('id', task.id)
          console.log(`✅ 组合任务 ${task.title} 已完成！`)
        }
      }
      // 连续任务：更新 completion_history
      else if (task.task_type === 'continuous') {
        const completionHistory = [...(progress.completion_history || [])]
        
        // 检查今天是否已记录
        const alreadyRecorded = completionHistory.some(h => h.date === today)
        
        if (!alreadyRecorded) {
          completionHistory.push({
            date: today,
            rule_name: behaviorNames[0],
            points: totalPoints
          })
          
          const streakCount = completionHistory.length
          const targetStreak = task.target_streak || 7
          const isCompleted = streakCount >= targetStreak
          
          console.log(`📝 连续任务 ${task.title}: 连续${streakCount}/${targetStreak}天, 完成:${isCompleted}`)
          
          await supabase.from('task_progress').update({
            completion_history: completionHistory,
            streak_count: streakCount,
            status: isCompleted ? 'completed' : 'active'
          }).eq('id', progress.id)
          
          if (isCompleted && progress.status !== 'completed') {
            await supabase.from('tasks').update({
              status: 'completed'
            }).eq('id', task.id)
            console.log(`✅ 连续任务 ${task.title} 已完成！`)
          }
        } else {
          console.log(`⏭️ 连续任务 ${task.title}: 今天已记录，跳过`)
        }
      }
      // 累计任务
      else if (task.task_type === 'cumulative') {
        const currentCount = progress.current_count || 0
        const newCount = currentCount + 1
        const targetCount = task.target_count || 5
        const isCompleted = newCount >= targetCount
        
        console.log(`📝 累计任务 ${task.title}: 进度${newCount}/${targetCount}, 完成:${isCompleted}`)
        
        await supabase.from('task_progress').update({
          current_count: newCount,
          status: isCompleted ? 'completed' : 'active'
        }).eq('id', progress.id)
        
        if (isCompleted && progress.status !== 'completed') {
          await supabase.from('tasks').update({
            status: 'completed'
          }).eq('id', task.id)
          console.log(`✅ 累计任务 ${task.title} 已完成！`)
        }
      }
      // 单次任务
      else {
        await supabase.from('task_progress').update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          current_count: (progress.current_count || 0) + 1
        }).eq('id', progress.id)
        
        await supabase.from('tasks').update({
          status: 'completed'
        }).eq('id', task.id)
      }
    }
    
    recordMessage.value = { 
      type: 'success', 
      text: `✨ ${child?.name} 完成 ${behaviorNames.join('、')}，共 +${totalPoints}分！${linkedTasks.value.length > 0 ? '（任务已同步完成）' : ''}`
    }
    
    // 重置弹窗
    showAddBehaviorModal.value = false
    selectedBehaviors.value = []
    behaviorNote.value = ''
    const resetDate = new Date()
    behaviorDate.value = `${resetDate.getFullYear()}-${String(resetDate.getMonth() + 1).padStart(2, '0')}-${String(resetDate.getDate()).padStart(2, '0')}`
    behaviorTime.value = new Date().toTimeString().slice(0, 5)
    
    await refreshData()
  } catch (error) {
    console.error('新增行为失败:', error)
    recordMessage.value = { type: 'error', text: '记录失败: ' + error.message }
  } finally {
    addingBehavior.value = false
    setTimeout(() => recordMessage.value = null, 3000)
  }
}

// 刷新数据
async function refreshData() {
  isRefreshing.value = true
  console.log('🔄 Dashboard: 开始刷新数据...')
  
  const startTime = performance.now()
  
  try {
    // 先加载核心数据（阻塞渲染）
    await loadChildren()
    await loadRules()
    
    // 再并行加载次要数据
    await Promise.all([
      loadTransactions(),
      loadStats(),
      loadTasks()
    ])
    
    const endTime = performance.now()
    console.log(`✅ Dashboard: 数据刷新完成，耗时 ${(endTime - startTime).toFixed(0)}ms`)
    
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

// 从note判断分类 - 与规则管理保持一致
function getCategoryFromNote(note) {
  if (!note) return '其他'

  const n = note.toLowerCase()

  // 运动健康
  if (n.includes('运动') || n.includes('锻炼') || n.includes('球') || n.includes('跑步')) return '运动健康'
  if (n.includes('游泳') || n.includes('骑车') || n.includes('跳绳') || n.includes('体操')) return '运动健康'
  if (n.includes('体育') || n.includes('健身') || n.includes('户外') || n.includes('瑜伽')) return '运动健康'

  // 学习成长
  if (n.includes('作业') || n.includes('阅读') || n.includes('学习') || n.includes('写字')) return '学习成长'
  if (n.includes('数学') || n.includes('英语') || n.includes('画画') || n.includes('科学')) return '学习成长'
  if (n.includes('英文') || n.includes('abc') || n.includes('reading') || n.includes('拼音')) return '学习成长'
  if (n.includes('语文') || n.includes('识字') || n.includes('看书') || n.includes('练习')) return '学习成长'
  if (n.includes('算术') || n.includes('计算') || n.includes('math') || n.includes('地理')) return '学习成长'

  // 生活自理 - 包含"自己"关键词
  if (n.includes('整理') || n.includes('家务') || n.includes('起床') || n.includes('睡觉')) return '生活自理'
  if (n.includes('刷牙') || n.includes('洗澡') || n.includes('穿衣') || n.includes('书包')) return '生活自理'
  if (n.includes('打扫') || n.includes('房间') || n.includes('叠被') || n.includes('洗漱')) return '生活自理'
  if (n.includes('收拾') || n.includes('清洁') || n.includes('洗碗') || n.includes('自己')) return '生活自理'

  // 艺术创造
  if (n.includes('钢琴') || n.includes('吉他') || n.includes('唱歌') || n.includes('跳舞')) return '艺术创造'
  if (n.includes('音乐') || n.includes('拍照') || n.includes('表演') || n.includes('手工')) return '艺术创造'
  if (n.includes('画') || n.includes('艺术') || n.includes('创作') || n.includes('摄影')) return '艺术创造'

  // 品德社交
  if (n.includes('帮助') || n.includes('分享') || n.includes('礼貌') || n.includes('感谢')) return '品德社交'
  if (n.includes('问好') || n.includes('友善') || n.includes('助人') || n.includes('合作')) return '品德社交'
  if (n.includes('夸奖') || n.includes('表扬') || n.includes('赞美') || n.includes('鼓励')) return '品德社交'
  if (n.includes('好人') || n.includes('善事') || n.includes('孝敬') || n.includes('尊重')) return '品德社交'

  // 作息规律
  if (n.includes('按时') || n.includes('早睡') || n.includes('午睡') || n.includes('作息')) return '作息规律'
  if (n.includes('早起') || n.includes('准时') || n.includes('闹钟')) return '作息规律'

  // 健康饮食
  if (n.includes('水果') || n.includes('蔬菜') || n.includes('牛奶') || n.includes('喝水')) return '健康饮食'
  if (n.includes('吃饭') || n.includes('健康') || n.includes('饮食') || n.includes('营养')) return '健康饮食'

  return '其他'
}

onMounted(async () => {
  await refreshData()
  // 图表初始化已移到 refreshData 内部，数据加载完成后执行
  
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
})
</script>

<style scoped>
/* 分类标签样式 */
.badge-category {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  background: #e3f2fd;
  color: #1976d2;
}

/* v4.0 图表区域样式 */
.charts-section {
  margin-bottom: 24px;
}

.charts-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.heatmap-full {
  margin-bottom: 20px;
}

@media (max-width: 1024px) {
  .charts-grid {
    grid-template-columns: 1fr;
  }
}

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
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
}

.behavior-categories {
  max-height: 400px;
  overflow-y: auto;
}

.behavior-category {
  margin-bottom: 20px;
}

.category-header {
  font-weight: 600;
  font-size: 1rem;
  color: #495057;
  margin-bottom: 10px;
  padding: 8px 12px;
  background: #f1f3f5;
  border-radius: 8px;
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
  position: relative;
}

.behavior-option:hover {
  background: #e9ecef;
}

.behavior-option.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: #667eea;
}

.check-mark {
  position: absolute;
  top: 4px;
  right: 4px;
  background: #51cf66;
  color: white;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
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

/* 扣分行为样式 */
.behavior-option.negative {
  background: linear-gradient(135deg, #fff5f5 0%, #ffe0e0 100%);
  border-color: #ff6b6b;
}

.behavior-option.negative:hover {
  background: linear-gradient(135deg, #ffe0e0 0%, #ffc9c9 100%);
}

.behavior-option.negative.active {
  background: linear-gradient(135deg, #ff416c 0%, #ff6b6b 100%);
  color: white;
  border-color: #ff416c;
}

.behavior-points.bad {
  color: #ff416c;
  font-weight: 600;
}

.behavior-option.negative.active .behavior-points.bad {
  color: #ffd43b;
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

/* 批量操作 */
.batch-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.selected-count {
  font-size: 0.9rem;
  color: #667eea;
  font-weight: 600;
}

.btn-danger {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 65, 108, 0.4);
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.3s;
}

.btn-secondary:hover {
  background: #dee2e6;
}

/* 删除按钮 */
.btn-icon.delete {
  background: #ffe3e3;
  color: #c92a2a;
  border: none;
  width: 32px;
  height: 32px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.btn-icon.delete:hover {
  background: #ff6b6b;
  color: white;
}

/* 筛选栏样式 */
.filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 12px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-group label {
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.filter-group select,
.filter-group input {
  padding: 8px 12px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 0.95rem;
  background: white;
  min-width: 120px;
}

.filter-group select:focus,
.filter-group input:focus {
  border-color: #667eea;
  outline: none;
}

.filter-reset-btn {
  height: fit-content;
  padding: 9px 16px;
}

/* 表格无数据提示 */
.no-data {
  text-align: center;
  color: #868e96;
  padding: 40px;
  font-style: italic;
}

/* 行为弹窗日期时间输入框样式 */
.form-row {
  display: flex;
  gap: 16px;
}

.form-group.half {
  flex: 1;
}

.date-input,
.time-input {
  width: 100%;
  padding: 10px 12px;
  border: 2px solid #dee2e6;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
}

.date-input:focus,
.time-input:focus {
  border-color: #667eea;
  outline: none;
}

@media (max-width: 768px) {
  .filter-bar {
    flex-direction: column;
    align-items: stretch;
  }
  
  .filter-group {
    width: 100%;
  }
  
  .filter-group select,
  .filter-group input {
    width: 100%;
  }
  
  .form-row {
    flex-direction: column;
    gap: 12px;
  }
}
</style>
