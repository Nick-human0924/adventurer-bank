<template>
  <div class="tasks-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🎯</span>
        <div class="header-text">
          <h2>智能任务系统</h2>
          <p>支持单次、连续、累计、组合四种任务类型</p>
        </div>
      </div>
      <button class="btn btn-primary create-task-btn" @click="openCreateModal">
        <span class="plus-icon">+</span>
        <span>发布新任务</span>
      </button>
    </div>

    <!-- 过滤器 -->
    <div class="filter-section">
      <div class="filter-tabs">
        <button 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span class="tab-label">{{ tab.label }}</span>
          <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
        </button>
      </div>
      <div class="view-toggle">
        <button 
          class="toggle-btn" 
          :class="{ active: viewMode === 'grid' }"
          @click="viewMode = 'grid'"
        >
          ⊞ 卡片
        </button>
        <button 
          class="toggle-btn" 
          :class="{ active: viewMode === 'list' }"
          @click="viewMode = 'list'"
        >
          ☰ 列表
        </button>
      </div>
    </div>

    <!-- 任务列表 -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      <div class="empty-illustration">
        <span class="empty-emoji">📝</span>
        <div class="floating-icons">
          <span>🏆</span>
          <span>⭐</span>
          <span>🎉</span>
        </div>
      </div>
      <h3>还没有任务</h3>
      <p>点击"发布新任务"创建第一个挑战！</p>
    </div>

    <!-- 卡片视图 -->
    <div v-else-if="viewMode === 'grid'" class="tasks-grid">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="task-card"
        :class="[getTaskTypeClass(task.task_type), task.status]"
        @click="openTaskDetail(task)"
      >
        <!-- 状态标签 -->
        <div class="task-status-badge" :class="task.status">
          <span class="status-dot"></span>
          {{ getStatusText(task.status) }}
        </div>

        <!-- 任务头部 -->
        <div class="task-header">
          <div class="task-type-icon" :class="task.task_type">
            {{ getTaskTypeIcon(task.task_type) }}
          </div>
          <div class="task-info">
            <h4 class="task-title">{{ task.title }}</h4>
            <div class="task-type-label">
              {{ getTaskTypeText(task.task_type) }}
            </div>
          </div>        </div>

        <!-- 任务描述 -->
        <p v-if="task.description" class="task-desc">{{ task.description }}</p>

        <!-- 进度区域 -->
        <div class="task-progress-section">
          <!-- 连续任务进度 -->
          <div v-if="task.task_type === 'continuous'" class="progress-detail">
            <div class="progress-header">
              <span class="progress-label">🔥 连续进度</span>
              <span class="progress-value">{{ task.progress?.streak_count || 0 }} / {{ task.target_streak || 7 }} 天</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill continuous" 
                :style="{ width: Math.min(((task.progress?.streak_count || 0) / (task.target_streak || 7)) * 100, 100) + '%' }"
              ></div>
            </div>
            <div class="streak-info">
              <span v-if="task.progress?.streak_count >= 3" class="streak-hot">
                🔥 已连 {{ task.progress.streak_count }} 天！
              </span>
              <span v-else class="streak-tips">
                💡 坚持就是胜利
              </span>
            </div>
          </div>

          <!-- 累计任务进度 -->
          <div v-else-if="task.task_type === 'cumulative'" class="progress-detail">
            <div class="progress-header">
              <span class="progress-label">📊 累计进度</span>
              <span class="progress-value">{{ task.progress?.current_count || 0 }} / {{ task.target_count || 5 }} 次</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill cumulative" 
                :style="{ width: Math.min(((task.progress?.current_count || 0) / (task.target_count || 5)) * 100, 100) + '%' }"
              ></div>
            </div>
          </div>

          <!-- 组合任务进度 -->
          <div v-else-if="task.task_type === 'combo'" class="combo-progress">
            <div class="combo-header">
              <span>🎯 组合进度</span>
              <span>{{ task.progress?.current_count || 0 }} / {{ task.target_count || 7 }} 天</span>
            </div>
            <!-- 子项矩阵 -->
            <div v-if="task.linkedRules" class="combo-matrix">
              <div 
                v-for="rule in task.linkedRules" 
                :key="rule.id"
                class="combo-item"
                :class="{ completed: isRuleCompletedToday(rule.id, task) }"
              >
                <span class="item-icon">{{ rule.icon || '📋' }}</span>
                <span class="item-status">
                  {{ isRuleCompletedToday(rule.id, task) ? '✅' : '⬜' }}
                </span>
                <span class="item-name">{{ rule.name }}</span>
              </div>
            </div>
            <!-- 今日完成提示 -->
            <div class="combo-today-status">
              <span v-if="getTodayCompletedCount(task) === task.linkedRules?.length">
                🎉 今日组合已完成！
              </span>
              <span v-else>
                ⏳ 今日还需完成 {{ (task.linkedRules?.length || 0) - getTodayCompletedCount(task) }} 项
              </span>
            </div>
          </div>

          <!-- 单次任务 -->
          <div v-else class="single-status">
            <span class="status-badge">
              {{ task.status === 'completed' ? '✅ 已完成' : '📋 等待完成' }}
            </span>
          </div>
        </div>

        <!-- 奖励信息 -->
        <div class="reward-section">
          <div class="reward-info">
            <span class="reward-label">🎁 完成奖励</span>
            <span class="reward-points">+{{ task.reward_points || task.points || 0 }}</span>
          </div>
          <div class="time-info">
            <span v-if="task.cycle_end" class="time-left">
              ⏰ 剩余 {{ getRemainingDays(task.cycle_end) }} 天
            </span>
          </div>
        </div>

        <!-- 操作按钮 -->
        <div class="task-actions">
          <button 
            v-if="task.status === 'active'"
            class="btn btn-check"
            @click.stop="checkProgress(task)"
            :disabled="checkingTask === task.id"
          >
            <span v-if="checkingTask === task.id">⏳</span>
            <span v-else>✅ 更新进度</span>
          </button>
          
          <button 
            v-if="task.status === 'completed' && !task.progress?.reward_claimed"
            class="btn btn-claim"
            @click.stop="claimReward(task)"
            :disabled="claimingTask === task.id"
          >
            <span v-if="claimingTask === task.id">⏳</span>
            <span v-else>🎁 领取奖励</span>
          </button>
          
          <button 
            v-if="task.progress?.reward_claimed"
            class="btn btn-claimed"
            disabled
          >
            ✓ 已领取
          </button>
          
          <button class="btn btn-edit" @click.stop="editTask(task)">
            ✏️ 编辑
          </button>
        </div>
      </div>
    </div>

    <!-- 列表视图 -->
    <div v-else class="tasks-list">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="task-list-item"
        :class="task.status"
        @click="openTaskDetail(task)"
      >
        <div class="list-icon">{{ getTaskTypeIcon(task.task_type) }}</div>
        <div class="list-info">
          <div class="list-title">{{ task.title }}</div>
          <div class="list-meta">
            <span class="meta-type">{{ getTaskTypeText(task.task_type) }}</span>
            <span class="meta-progress">
              {{ getProgressText(task) }}
            </span>
          </div>
        </div>
        
        <div class="list-reward">+{{ task.reward_points || task.points || 0 }}</div>
        
        <div class="list-status" :class="task.status">
          {{ getStatusText(task.status) }}
        </div>
      </div>
    </div>

    <!-- 创建/编辑任务弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal task-modal">
        <div class="modal-header">
          <h3>{{ editingTask ? '✏️ 编辑任务' : '📝 发布新任务' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        
        <form @submit.prevent="saveTask">
          <!-- 任务名称 -->
          <div class="form-group">
            <label>任务名称 *</label>
            <input 
              v-model="taskForm.title" 
              required 
              placeholder="例如：早起挑战、阅读周计划"
            >
          </div>
          
          <!-- 任务类型 -->
          <div class="form-group">
            <label>任务类型 *</label>
            <div class="type-selector">
              <button 
                v-for="type in taskTypes" 
                :key="type.value"
                type="button"
                class="type-btn"
                :class="{ active: taskForm.task_type === type.value }"
                @click="selectTaskType(type.value)"
              >
                <span class="type-icon">{{ type.icon }}</span>
                <div class="type-info">
                  <span class="type-name">{{ type.label }}</span>
                  <span class="type-desc">{{ type.desc }}</span>
                </div>
              </button>
            </div>
          </div>
          
          <!-- 动态配置：根据任务类型显示不同选项 -->
          <div v-if="taskForm.task_type === 'continuous'" class="form-group">
            <label>连续天数目标 *</label>
            <div class="number-input">
              <button type="button" @click="taskForm.target_streak = Math.max(1, taskForm.target_streak - 1)">-</button>
              <input 
                v-model.number="taskForm.target_streak" 
                type="number" 
                min="1" 
                max="30"
              >
              <button type="button" @click="taskForm.target_streak = Math.min(30, taskForm.target_streak + 1)">+</button>
              <span class="unit">天</span>
            </div>
            <small class="form-hint">连续打卡达到目标天数即可获得奖励，中断需重新计数</small>
          </div>
          
          <div v-if="taskForm.task_type === 'cumulative'" class="form-group">
            <label>累计次数目标 *</label>
            <div class="number-input">
              <button type="button" @click="taskForm.target_count = Math.max(1, taskForm.target_count - 1)">-</button>
              <input 
                v-model.number="taskForm.target_count" 
                type="number" 
                min="1"
              >
              <button type="button" @click="taskForm.target_count = taskForm.target_count + 1">+</button>
              <span class="unit">次</span>
            </div>
            <small class="form-hint">累计完成指定次数即可获得奖励</small>
          </div>
          
          <div v-if="taskForm.task_type === 'combo'" class="form-group">
            <label>组合子任务 *</label>
            <div class="combo-rules-selector">
              <div v-if="availableRules.length === 0" class="no-rules">
                请先前往"行为规则"页面创建规则
              </div>
              <div v-else class="rules-checkboxes">
                <label 
                  v-for="rule in availableRules" 
                  :key="rule.id"
                  class="rule-checkbox"
                  :class="{ checked: taskForm.linked_rule_ids.includes(rule.id) }"
                >
                  <input 
                    type="checkbox" 
                    :value="rule.id"
                    v-model="taskForm.linked_rule_ids"
                  >
                  <span class="rule-icon">{{ rule.icon || '📋' }}</span>
                  <span class="rule-name">{{ rule.name }}</span>
                  <span class="rule-points">+{{ rule.points }}</span>
                </label>
              </div>
            </div>
            
            <div class="form-group">
              <label>需要完成天数 *</label>
              <div class="number-input">
                <button type="button" @click="taskForm.target_count = Math.max(1, taskForm.target_count - 1)">-</button>
                <input v-model.number="taskForm.target_count" type="number" min="1" max="30">
                <button type="button" @click="taskForm.target_count = Math.min(30, taskForm.target_count + 1)">+</button>
                <span class="unit">天</span>
              </div>
              
              <small class="form-hint">每天完成所有子任务，坚持达到目标天数</small>
            </div>
          </div>
          
          <!-- 任务周期 -->
          <div class="form-row">
            <div class="form-group">
              <label>开始日期</label>
              <input v-model="taskForm.cycle_start" type="date">
            </div>
            
            <div class="form-group">
              <label>结束日期</label>
              <input v-model="taskForm.cycle_end" type="date">
            </div>
          </div>
          
          <!-- 奖励设置 -->
          <div class="form-group">
            <label>完成奖励积分 *</label>
            <div class="number-input">
              <button type="button" @click="taskForm.reward_points = Math.max(0, taskForm.reward_points - 5)">-</button>
              <input 
                v-model.number="taskForm.reward_points" 
                type="number" 
                min="0" 
                step="5"
                required
              >
              <button type="button" @click="taskForm.reward_points = taskForm.reward_points + 5">+</button>
              <span class="unit">积分</span>
            </div>
          </div>
          
          <!-- 任务描述 -->
          <div class="form-group">
            <label>任务描述</label>
            <textarea 
              v-model="taskForm.description" 
              rows="3" 
              placeholder="详细描述任务要求和注意事项..."
            ></textarea>
          </div>
          
          <!-- 分配给孩子 -->
          <div class="form-group">
            <label>分配给孩子</label>
            <div class="child-selector">
              <label 
                v-for="child in children" 
                :key="child.id"
                class="child-checkbox"
                :class="{ checked: taskForm.child_ids.includes(child.id) }"
              >
                <input 
                  type="checkbox" 
                  :value="child.id"
                  v-model="taskForm.child_ids"
                >
                <span class="child-avatar">{{ child.avatar || '👶' }}</span>
                <span class="child-name">{{ child.name }}</span>
              </label>
            </div>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">
              取消
            </button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              <span v-if="saving">保存中...</span>
              <span v-else>{{ editingTask ? '更新' : '发布' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <div v-if="showDetailModal" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal detail-modal">
        <div class="modal-header">
          <h3>{{ selectedTask?.title }}</h3>
          <button class="close-btn" @click="closeDetailModal">&times;</button>
        </div>
        
        <div v-if="selectedTask" class="detail-content">
          <!-- 任务信息 -->
          <div class="detail-info">
            <div class="detail-type">
              <span class="type-icon">{{ getTaskTypeIcon(selectedTask.task_type) }}</span>
              <span>{{ getTaskTypeText(selectedTask.task_type) }}</span>
            </div>            
            
            <p v-if="selectedTask.description" class="detail-desc">
              {{ selectedTask.description }}
            </p>
          </div>
          
          <!-- 进度详情 -->
          <div class="detail-progress">
            <h4>📊 任务进度</h4>            
            <div v-if="selectedTask.task_type === 'continuous'" class="progress-stats">
              <div class="stat-row">
                <span>当前连续：</span>
                <span class="stat-value">{{ selectedTask.progress?.streak_count || 0 }} 天</span>
              </div>
              
              <div class="stat-row">
                <span>目标连续：</span>
                <span class="stat-value">{{ selectedTask.target_streak || 7 }} 天</span>
              </div>
              
              <div class="stat-row">
                <span>最长连续：</span>
                <span class="stat-value">{{ selectedTask.progress?.longest_streak || 0 }} 天</span>
              </div>
            </div>
            
            <div v-else-if="selectedTask.task_type === 'cumulative'" class="progress-stats">
              <div class="stat-row">
                <span>当前进度：</span>
                <span class="stat-value">{{ selectedTask.progress?.current_count || 0 }} 次</span>
              </div>
              
              <div class="stat-row">
                <span>目标次数：</span>
                <span class="stat-value">{{ selectedTask.target_count || 5 }} 次</span>
              </div>
            </div>
            
            <div v-else-if="selectedTask.task_type === 'combo'" class="combo-detail">
              <div class="combo-rules">
                <div 
                  v-for="rule in selectedTask.linkedRules" 
                  :key="rule.id"
                  class="combo-rule-item"
                >
                  <span>{{ rule.icon }} {{ rule.name }}</span>
                  <span>+{{ rule.points }} 分</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- 日历视图 -->
          <div class="detail-calendar">
            <h4>📅 完成日历</h4>            
            <div class="calendar-grid">
              <div 
                v-for="day in calendarDays" 
                :key="day.date"
                class="calendar-day"
                :class="{ completed: day.completed, today: day.isToday }"
                :title="day.tooltip"
              >
                <span class="day-number">{{ day.dayOfMonth }}</span>
                <span v-if="day.completed" class="day-check">✓</span>
              </div>
            </div>
          </div>
          
          <!-- 奖励信息 -->
          <div class="detail-reward">
            <h4>🎁 完成奖励</h4>            
            <div class="reward-display">
              <span class="reward-amount">{{ selectedTask.reward_points || selectedTask.points || 0 }}</span>
              <span class="reward-unit">积分</span>            </div>
            
            <div v-if="selectedTask.progress?.reward_claimed" class="claimed-info">
              ✅ 已于 {{ formatDate(selectedTask.progress.reward_claimed_at) }} 领取
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, reactive } from 'vue'
import { supabase } from '../utils/supabase.js'
import { 
  TaskTypes, 
  TaskStatus,
  getTaskTypeText, 
  getTaskTypeIcon,
  getTaskStatusText,
  getRemainingDays,
  checkTaskProgress,
  createMockSuperWeekChallenge
} from '../lib/tasks.js'

// 状态
const tasks = ref([])
const children = ref([])
const availableRules = ref([])
const currentFilter = ref('all')
const viewMode = ref('grid')
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const editingTask = ref(null)
const selectedTask = ref(null)
const saving = ref(false)
const checkingTask = ref(null)
const claimingTask = ref(null)

// 表单
const taskForm = reactive({
  title: '',
  task_type: 'single',
  target_count: 5,
  target_streak: 7,
  linked_rule_ids: [],
  cycle_start: new Date().toISOString().split('T')[0],
  cycle_end: '',
  reward_points: 20,
  description: '',
  child_ids: [],
  icon: '📋'
})

// 过滤器
const filterTabs = computed(() => [
  { value: 'all', label: '全部', icon: '📋', count: tasks.value.length },
  { value: 'active', label: '进行中', icon: '🟢', count: tasks.value.filter(t => t.status === 'active').length },
  { value: 'completed', label: '已完成', icon: '✅', count: tasks.value.filter(t => t.status === 'completed').length },
  { value: 'continuous', label: '连续', icon: '🔥', count: tasks.value.filter(t => t.task_type === 'continuous').length },
  { value: 'combo', label: '组合', icon: '🎯', count: tasks.value.filter(t => t.task_type === 'combo').length }
])

// 任务类型选项
const taskTypes = [
  { 
    value: 'single', 
    label: '单次任务', 
    icon: '📋',
    desc: '完成一次即结束，简单直接'
  },
  { 
    value: 'continuous', 
    label: '连续挑战', 
    icon: '🔥',
    desc: '连续N天完成，中断需重新计数'
  },
  { 
    value: 'cumulative', 
    label: '累计任务', 
    icon: '📊',
    desc: '累计完成N次，可间断'
  },
  { 
    value: 'combo', 
    label: '组合套餐', 
    icon: '🎯',
    desc: '每天完成多个子任务'
  }
]

// 过滤后的任务
const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return tasks.value
  if (currentFilter.value === 'active') return tasks.value.filter(t => t.status === 'active')
  if (currentFilter.value === 'completed') return tasks.value.filter(t => t.status === 'completed')
  return tasks.value.filter(t => t.task_type === currentFilter.value)
})

// 日历数据
const calendarDays = computed(() => {
  if (!selectedTask.value) return []
  
  const days = []
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // 获取当月天数
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate()
  
  // 获取任务完成历史
  const completionHistory = selectedTask.value.progress?.completion_history || []
  
  for (let i = 1; i <= daysInMonth; i++) {
    const date = new Date(currentYear, currentMonth, i)
    const dateStr = date.toISOString().split('T')[0]
    const isToday = i === today.getDate()
    
    // 检查当天是否完成
    const completed = completionHistory.some(h => h.date === dateStr)
    
    days.push({
      dayOfMonth: i,
      date: dateStr,
      completed,
      isToday,
      tooltip: completed ? `✅ ${dateStr} 已完成` : dateStr
    })
  }
  
  return days
})

// 加载任务
async function loadTasks() {
  try {
    // 获取任务列表
    const { data: tasksData, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // 获取每个任务的进度
    const tasksWithProgress = await Promise.all(
      (tasksData || []).map(async (task) => {
        // 获取任务进度
        const { data: progress } = await supabase
          .from('task_progress')
          .select('*')
          .eq('task_id', task.id)
          .single()
        
        // 如果是组合任务，获取关联的规则详情
        let linkedRules = []
        if (task.task_type === 'combo' && task.linked_rule_ids?.length > 0) {
          const { data: rules } = await supabase
            .from('rules')
            .select('*')
            .in('id', task.linked_rule_ids)
          linkedRules = rules || []
        }
        
        return {
          ...task,
          progress: progress || null,
          linkedRules
        }
      })
    )
    
    tasks.value = tasksWithProgress
  } catch (error) {
    console.error('加载任务失败:', error)
  }
}

// 加载孩子列表
async function loadChildren() {
  const { data } = await supabase.from('children').select('*').order('name')
  children.value = data || []
}

// 加载可用规则
async function loadRules() {
  const { data } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)
    .order('name')
  availableRules.value = data || []
}

// 创建Mock测试数据
async function createMockData() {
  if (children.value.length === 0) {
    console.log('没有孩子，跳过创建Mock数据')
    return
  }
  
  const result = await createMockSuperWeekChallenge(
    children.value[0].id,
    (await supabase.auth.getUser()).data.user?.id
  )
  
  if (result.success) {
    console.log('✅ Mock数据创建成功')
    await loadTasks()
  }
}

// 打开创建弹窗
function openCreateModal() {
  editingTask.value = null
  resetForm()
  showCreateModal.value = true
}

// 关闭弹窗
function closeModal() {
  showCreateModal.value = false
  editingTask.value = null
}

// 重置表单
function resetForm() {
  taskForm.title = ''
  taskForm.task_type = 'single'
  taskForm.target_count = 5
  taskForm.target_streak = 7
  taskForm.linked_rule_ids = []
  taskForm.cycle_start = new Date().toISOString().split('T')[0]
  taskForm.cycle_end = ''
  taskForm.reward_points = 20
  taskForm.description = ''
  taskForm.child_ids = children.value.map(c => c.id)
  taskForm.icon = '📋'
}

// 选择任务类型
function selectTaskType(type) {
  taskForm.task_type = type
  
  // 根据类型设置默认值
  switch (type) {
    case 'continuous':
      taskForm.target_streak = 7
      break
    case 'cumulative':
      taskForm.target_count = 5
      break
    case 'combo':
      taskForm.target_count = 7
      break
  }
}

// 保存任务
async function saveTask() {
  saving.value = true
  try {
    const taskData = {
      title: taskForm.title,
      task_type: taskForm.task_type,
      description: taskForm.description,
      reward_points: taskForm.reward_points,
      points: taskForm.reward_points,
      cycle_start: taskForm.cycle_start || null,
      cycle_end: taskForm.cycle_end || null,
      icon: taskForm.icon
    }
    
    // 根据类型设置特定字段
    if (taskForm.task_type === 'continuous') {
      taskData.target_streak = taskForm.target_streak
    } else if (taskForm.task_type === 'cumulative' || taskForm.task_type === 'combo') {
      taskData.target_count = taskForm.target_count
    }
    
    if (taskForm.task_type === 'combo') {
      taskData.linked_rule_ids = taskForm.linked_rule_ids
    }
    
    if (editingTask.value) {
      // 更新任务
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.value.id)
      
      if (error) throw error
    } else {
      // 创建任务
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()
      
      if (error) throw error
      
      // 为每个孩子创建进度记录
      for (const childId of taskForm.child_ids) {
        await supabase.from('task_progress').insert({
          task_id: newTask.id,
          child_id: childId,
          status: 'active',
          combo_progress: taskForm.task_type === 'combo' ? {} : {}
        })
      }
    }
    
    await loadTasks()
    closeModal()
  } catch (error) {
    console.error('保存任务失败:', error)
    alert('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 编辑任务
function editTask(task) {
  editingTask.value = task
  taskForm.title = task.title
  taskForm.task_type = task.task_type
  taskForm.target_count = task.target_count || 5
  taskForm.target_streak = task.target_streak || 7
  taskForm.linked_rule_ids = task.linked_rule_ids || []
  taskForm.cycle_start = task.cycle_start
  taskForm.cycle_end = task.cycle_end
  taskForm.reward_points = task.reward_points || task.points || 20
  taskForm.description = task.description || ''
  taskForm.icon = task.icon || '📋'
  
  showCreateModal.value = true
}

// 检查进度（手动触发）
async function checkProgress(task) {
  if (!task.progress) return
  
  checkingTask.value = task.id
  try {
    // 模拟检查进度（实际应基于行为记录自动触发）
    console.log('检查进度:', task.title)
    
    // 重新加载任务
    await loadTasks()
  } catch (error) {
    console.error('检查进度失败:', error)
  } finally {
    checkingTask.value = null
  }
}

// 领取奖励
async function claimReward(task) {
  if (!task.progress) return
  
  claimingTask.value = task.id
  try {
    // 调用数据库函数发放奖励
    const { data, error } = await supabase
      .rpc('award_task_reward', {
        p_task_id: task.id,
        p_child_id: task.progress.child_id
      })
    
    if (error) throw error
    
    const result = JSON.parse(data)
    
    if (result.success) {
      alert(`🎉 ${result.message}！获得 ${result.points_awarded} 积分`)
      await loadTasks()
    } else {
      alert(result.message)
    }
  } catch (error) {
    console.error('领取奖励失败:', error)
    alert('领取失败: ' + error.message)
  } finally {
    claimingTask.value = null
  }
}

// 打开任务详情
function openTaskDetail(task) {
  selectedTask.value = task
  showDetailModal.value = true
}

// 关闭详情弹窗
function closeDetailModal() {
  showDetailModal.value = false
  selectedTask.value = null
}

// 工具函数
function getTaskTypeClass(type) {
  return type || 'single'
}

function getStatusText(status) {
  return getTaskStatusText(status)
}

function getProgressText(task) {
  if (task.task_type === 'continuous') {
    return `${task.progress?.streak_count || 0}/${task.target_streak || 7}天`
  } else if (task.task_type === 'cumulative') {
    return `${task.progress?.current_count || 0}/${task.target_count || 5}次`
  } else if (task.task_type === 'combo') {
    return `${task.progress?.current_count || 0}/${task.target_count || 7}天`
  }
  return ''
}

function getTodayCompletedCount(task) {
  if (!task.progress?.combo_progress) return 0
  
  const today = new Date().toISOString().split('T')[0]
  let count = 0
  
  for (const key in task.progress.combo_progress) {
    if (task.progress.combo_progress[key].date === today) {
      count++
    }
  }
  
  return count
}

function isRuleCompletedToday(ruleId, task) {
  if (!task.progress?.combo_progress) return false
  
  const today = new Date().toISOString().split('T')[0]
  return task.progress.combo_progress[ruleId]?.date === today
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return date.toLocaleDateString('zh-CN')
}

onMounted(async () => {
  await Promise.all([
    loadTasks(),
    loadChildren(),
    loadRules()
  ])
  
  // 如果没有任务，创建Mock数据
  if (tasks.value.length === 0 && children.value.length > 0) {
    await createMockData()
  }
})
</script>

<style scoped>
.tasks-page {
  padding: 24px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text h2 {
  margin: 0;
  font-size: 1.6rem;
  color: #333;
}

.header-text p {
  margin: 4px 0 0 0;
  color: #868e96;
  font-size: 0.95rem;
}

.create-task-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 24px;
  font-size: 1rem;
}

/* 过滤器 */
.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 16px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 24px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  color: #495057;
  transition: all 0.3s;
}

.filter-tab:hover {
  border-color: #667eea;
}

.filter-tab.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.tab-count {
  background: rgba(255,255,255,0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 0.8rem;
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.toggle-btn {
  padding: 8px 16px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.3s;
}

.toggle-btn.active {
  background: #667eea;
  color: white;
  border-color: #667eea;
}

/* 任务卡片网格 */
.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  gap: 20px;
}

.task-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
  border-left: 4px solid #dee2e6;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.12);
}

.task-card.single {
  border-left-color: #4facfe;
}

.task-card.continuous {
  border-left-color: #fa709a;
}

.task-card.cumulative {
  border-left-color: #11998e;
}

.task-card.combo {
  border-left-color: #f093fb;
}

.task-card.completed {
  opacity: 0.8;
  background: #f8f9fa;
}

/* 状态标签 */
.task-status-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.task-status-badge.active {
  background: #d3f9d8;
  color: #2b8a3e;
}

.task-status-badge.completed {
  background: #e7f3ff;
  color: #1971c2;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
}

/* 任务头部 */
.task-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
  padding-right: 80px;
}

.task-type-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.8rem;
  background: #f8f9fa;
}

.task-type-icon.single {
  background: #e7f3ff;
}

.task-type-icon.continuous {
  background: #ffe0e0;
}

.task-type-icon.cumulative {
  background: #d3f9d8;
}

.task-type-icon.combo {
  background: #f3d9fa;
}

.task-info {
  flex: 1;
}

.task-title {
  margin: 0 0 4px 0;
  font-size: 1.15rem;
  color: #333;
}

.task-type-label {
  font-size: 0.8rem;
  color: #868e96;
}

.task-desc {
  color: #495057;
  font-size: 0.9rem;
  line-height: 1.5;
  margin-bottom: 16px;
}

/* 进度区域 */
.task-progress-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.progress-detail {
  margin-bottom: 8px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.progress-label {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.progress-value {
  font-size: 1rem;
  color: #333;
  font-weight: 700;
}

.progress-bar {
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.progress-fill.continuous {
  background: linear-gradient(90deg, #fa709a, #ff6b6b);
}

.progress-fill.cumulative {
  background: linear-gradient(90deg, #11998e, #38ef7d);
}

.streak-info {
  font-size: 0.85rem;
}

.streak-hot {
  color: #fa709a;
  font-weight: 600;
}

.streak-tips {
  color: #868e96;
}

/* 组合任务矩阵 */
.combo-progress {
  margin-bottom: 8px;
}

.combo-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  font-weight: 500;
  color: #495057;
}

.combo-matrix {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 8px;
  margin-bottom: 12px;
}

.combo-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding: 12px 8px;
  background: white;
  border-radius: 10px;
  border: 2px solid #e9ecef;
  transition: all 0.3s;
}

.combo-item.completed {
  border-color: #38ef7d;
  background: #d3f9d8;
}

.item-icon {
  font-size: 1.5rem;
}

.item-status {
  font-size: 0.9rem;
}

.item-name {
  font-size: 0.75rem;
  color: #495057;
  text-align: center;
}

.combo-today-status {
  text-align: center;
  padding: 8px;
  background: white;
  border-radius: 8px;
  font-size: 0.9rem;
  color: #495057;
}

/* 奖励区域 */
.reward-section {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.reward-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.reward-label {
  font-size: 0.85rem;
  color: #868e96;
}

.reward-points {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 1rem;
}

.time-info {
  font-size: 0.85rem;
  color: #868e96;
}

.time-left {
  color: #fa709a;
  font-weight: 500;
}

/* 操作按钮 */
.task-actions {
  display: flex;
  gap: 8px;
}

.task-actions .btn {
  flex: 1;
  padding: 10px 16px;
  font-size: 0.85rem;
  justify-content: center;
}

.btn-check {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
}

.btn-claim {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
  border: none;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 147, 251, 0.4); }
  50% { box-shadow: 0 0 0 10px rgba(240, 147, 251, 0); }
}

.btn-claimed {
  background: #d3f9d8;
  color: #2b8a3e;
  cursor: default;
}

/* 列表视图 */
.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.task-list-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: white;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}

.task-list-item:hover {
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
}

.list-icon {
  font-size: 1.8rem;
  width: 48px;
  height: 48px;
  background: #f8f9fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.list-info {
  flex: 1;
}

.list-title {
  font-weight: 600;
  color: #333;
  margin-bottom: 4px;
}

.list-meta {
  display: flex;
  gap: 12px;
  font-size: 0.85rem;
  color: #868e96;
}

.list-reward {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 700;
}

.list-status {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
}

.list-status.active {
  background: #d3f9d8;
  color: #2b8a3e;
}

.list-status.completed {
  background: #e7f3ff;
  color: #1971c2;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 40px;
  background: white;
  border-radius: 20px;
}

.empty-illustration {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.empty-emoji {
  font-size: 4rem;
}

.floating-icons {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.floating-icons span {
  position: absolute;
  font-size: 1.2rem;
  animation: float 2s ease-in-out infinite;
}

.floating-icons span:nth-child(1) {
  top: -5px;
  left: -20px;
}

.floating-icons span:nth-child(2) {
  top: -10px;
  right: -15px;
  animation-delay: 0.5s;
}

.floating-icons span:nth-child(3) {
  bottom: -5px;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: 1s;
}

/* 弹窗样式 */
.task-modal {
  max-width: 600px;
}

.detail-modal {
  max-width: 500px;
}

.type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.type-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  text-align: left;
}

.type-btn:hover {
  border-color: #667eea;
}

.type-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.type-icon {
  font-size: 2rem;
}

.type-info {
  display: flex;
  flex-direction: column;
}

.type-name {
  font-weight: 600;
  margin-bottom: 2px;
}

.type-desc {
  font-size: 0.8rem;
  opacity: 0.8;
}

.number-input {
  display: flex;
  align-items: center;
  gap: 8px;
}

.number-input button {
  width: 36px;
  height: 36px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
}

.number-input button:hover {
  border-color: #667eea;
  background: #f8f9ff;
}

.number-input input {
  width: 80px;
  text-align: center;
  font-weight: 600;
}

.unit {
  color: #868e96;
  font-size: 0.9rem;
}

.combo-rules-selector {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
}

.no-rules {
  text-align: center;
  color: #868e96;
  padding: 20px;
}

.rules-checkboxes {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rule-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.rule-checkbox:hover {
  border-color: #667eea;
}

.rule-checkbox.checked {
  border-color: #38ef7d;
  background: #d3f9d8;
}

.rule-checkbox input {
  display: none;
}

.rule-icon {
  font-size: 1.3rem;
}

.rule-name {
  flex: 1;
}

.rule-points {
  background: #e9ecef;
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 600;
}

/* 详情弹窗内容 */
.detail-content {
  padding: 20px 0;
}

.detail-info {
  margin-bottom: 24px;
}

.detail-type {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  color: #495057;
}

.type-icon {
  font-size: 1.5rem;
}

.detail-desc {
  color: #495057;
  line-height: 1.6;
}

.detail-progress {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.detail-progress h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.progress-stats {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #e9ecef;
}

.stat-row:last-child {
  border-bottom: none;
}

.stat-value {
  font-weight: 700;
  color: #667eea;
}

.combo-detail {
  margin-top: 12px;
}

.combo-rules {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combo-rule-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
}

/* 日历 */
.detail-calendar {
  margin-bottom: 24px;
}

.detail-calendar h4 {
  margin: 0 0 16px 0;
  color: #333;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #f8f9fa;
  border-radius: 8px;
  font-size: 0.85rem;
  position: relative;
  cursor: pointer;
  transition: all 0.3s;
}

.calendar-day:hover {
  background: #e7f3ff;
}

.calendar-day.completed {
  background: #d3f9d8;
}

.calendar-day.today {
  border: 2px solid #667eea;
}

.day-number {
  font-size: 0.9rem;
}

.day-check {
  position: absolute;
  bottom: 2px;
  font-size: 0.7rem;
  color: #2b8a3e;
}

/* 奖励 */
.detail-reward {
  background: linear-gradient(135deg, #fff9db 0%, #fff3bf 100%);
  border-radius: 12px;
  padding: 20px;
  text-align: center;
}

.detail-reward h4 {
  margin: 0 0 12px 0;
  color: #333;
}

.reward-display {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4px;
}

.reward-amount {
  font-size: 2.5rem;
  font-weight: 800;
  color: #f08c00;
}

.reward-unit {
  font-size: 1rem;
  color: #868e96;
}

.claimed-info {
  margin-top: 12px;
  padding: 8px;
  background: #d3f9d8;
  color: #2b8a3e;
  border-radius: 8px;
  font-size: 0.9rem;
}

@media (max-width: 768px) {
  .tasks-grid {
    grid-template-columns: 1fr;
  }
  
  .type-selector {
    grid-template-columns: 1fr;
  }
  
  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }
  
  .view-toggle {
    justify-content: center;
  }
}
</style>
