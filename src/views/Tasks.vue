<template>
  <div class="tasks-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🚩</span>
        <div class="header-text">
          <h2>任务与闯关</h2>
          <p>智能任务系统，挑战自我，赢取奖励！</p>
        </div>
      </div>
      <button class="btn btn-primary create-task-btn" @click="openCreateModal">
        <span class="plus-icon">+</span>
        <span>发布新任务</span>
      </button>
    </div>

    <!-- Mock数据测试按钮 -->
    <div class="mock-banner" v-if="!hasMockData">
      <span>🧪 体验新功能？</span>
      <button class="btn btn-mock" @click="createMockData">
        创建测试任务
      </button>
    </div>

    <!-- 过滤器 -->
    <div class="filter-bar">
      <div class="filter-tabs">
        <button 
          v-for="tab in filterTabs" 
          :key="tab.value"
          class="filter-tab"
          :class="{ active: currentFilter === tab.value }"
          @click="currentFilter = tab.value"
        >
          <span class="tab-icon">{{ tab.icon }}</span>
          <span>{{ tab.label }}</span>
        </button>
      </div>
    </div>

    <!-- 空状态 -->
    <div v-if="filteredTasks.length === 0" class="empty-state">
      <div class="empty-illustration">
        <span class="empty-emoji">🎯</span>
      </div>
      <h3>还没有任务</h3>
      <p>点击右上角创建第一个挑战任务！</p>
    </div>

    <!-- 任务卡片流 -->
    <div v-else class="tasks-flow">
      <div 
        v-for="task in filteredTasks" 
        :key="task.id"
        class="task-card"
        :class="[getTaskTypeClass(task.task_type), task.status]"
        @click="openTaskDetail(task)"
      >
        <!-- 状态标签 -->
        <div class="task-status-badge" :class="getTaskStatusClass(task)">
          <span class="status-dot"></span>
          {{ getTaskStatusLabel(task) }}
        </div>

        <!-- 任务头部 -->
        <div class="task-header">
          <div class="task-icon">{{ task.icon || getTaskTypeIcon(task.task_type) }}</div>
          <div class="task-info">
            <h4 class="task-title">{{ task.title }}</h4>
            <div class="task-tags">
              <span class="tag type-tag" :class="task.task_type">
                {{ getTaskTypeText(task.task_type) }}
              </span>
              <span v-if="isExpiringSoon(task)" class="tag warning-tag">
                ⏰ 即将到期
              </span>
            </div>
          </div>
          <div class="task-points">
            <span class="points-value">+{{ task.reward_points || task.points }}</span>
            <span class="points-label">积分</span>
          </div>
        </div>

        <!-- 任务描述 -->
        <p v-if="task.description" class="task-desc">{{ task.description }}</p>

        <!-- 进度可视化 -->
        <div class="task-progress-section">
          <!-- 连续任务进度 -->
          <div v-if="task.task_type === 'continuous' && task.progress" class="progress-visual">
            <div class="progress-header">
              <span class="progress-label">🔥 连续天数</span>
              <span class="progress-value">{{ task.progress.streak_count || 0 }}/{{ task.target_streak || 7 }}天</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill streak-fill" 
                :style="{ width: formatProgress(task.progress.streak_count, task.target_streak) + '%' }"
              ></div>
            </div>
            <!-- 火焰序列 -->
            <div class="streak-flames">
              <span 
                v-for="n in task.target_streak || 7" 
                :key="n"
                class="flame"
                :class="{ active: n <= (task.progress.streak_count || 0) }"
              >
                {{ n <= (task.progress.streak_count || 0) ? '🔥' : '⚪' }}
              </span>
            </div>
          </div>

          <!-- 累计任务进度 -->
          <div v-else-if="task.task_type === 'cumulative' && task.progress" class="progress-visual">
            <div class="progress-header">
              <span class="progress-label">📊 累计进度</span>
              <span class="progress-value">{{ task.progress.current_count || 0 }}/{{ task.target_count || 5 }}次</span>
            </div>
            <div class="progress-bar">
              <div 
                class="progress-fill cumulative-fill" 
                :style="{ width: formatProgress(task.progress.current_count, task.target_count) + '%' }"
              ></div>
            </div>
            <!-- 进度点阵 -->
            <div class="progress-dots">
              <span 
                v-for="n in Math.min(task.target_count || 5, 10)" 
                :key="n"
                class="dot"
                :class="{ filled: n <= (task.progress.current_count || 0) }"
              ></span>
              <span v-if="(task.target_count || 5) > 10" class="more-dots">...</span>
            </div>
          </div>

          <!-- 组合任务子项矩阵 -->
          <div v-else-if="task.task_type === 'combo' && task.progress" class="combo-matrix">
            <div class="combo-header">
              <span class="combo-label">🎯 今日进度</span>
              <span class="combo-value">{{ task.progress.current_count || 0 }}/{{ task.target_count || 7 }}天</span>
            </div>
            <div class="combo-rules">
              <div 
                v-for="(rule, index) in task.linked_rules || []" 
                :key="rule.id"
                class="combo-rule-item"
                :class="{ completed: isComboRuleCompleted(task, rule.id) }"
              >
                <span class="rule-icon">{{ rule.icon }}</span>
                <span class="rule-status">
                  {{ isComboRuleCompleted(task, rule.id) ? '✅' : '⬜' }}
                </span>
                <span class="rule-name">{{ rule.name }}</span>
              </div>
            </div>
            <!-- 天数进度条 -->
            <div class="days-progress">
              <div class="days-track">
                <div 
                  v-for="day in task.target_count || 7" 
                  :key="day"
                  class="day-marker"
                  :class="{ completed: day <= (task.progress.current_count || 0) }"
                >
                  {{ day }}
                </div>
              </div>
            </div>
          </div>

          <!-- 单次任务状态 -->
          <div v-else-if="task.task_type === 'single'" class="single-status">
            <span v-if="task.status === 'completed'" class="completed-badge">
              ✅ 已完成
            </span>
            <span v-else class="pending-badge">
              ⏳ 待完成
            </span>
          </div>
        </div>

        <!-- 底部信息 -->
        <div class="task-footer">
          <div class="task-assignees" v-if="task.children && task.children.length > 0">
            <span class="assignee-label">分配给:</span>
            <div class="assignee-avatars">
              <span 
                v-for="child in task.children.slice(0, 3)" 
                :key="child.id"
                class="assignee-avatar"
                :title="child.name"
              >
                {{ child.avatar || '👶' }}
              </span>
              <span v-if="task.children.length > 3" class="assignee-more">
                +{{ task.children.length - 3 }}
              </span>
            </div>
          </div>
          <div class="task-deadline" v-if="task.cycle_end">
            <span class="deadline-icon">📅</span>
            <span :class="{ urgent: isExpiringSoon(task) }">
              {{ getRemainingDays(task.cycle_end) }}天到期
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑任务弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeCreateModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>{{ editingTask ? '✏️ 编辑任务' : '📝 发布新任务' }}</h3>
          <button class="close-btn" @click="closeCreateModal">&times;</button>
        </div>
        
        <form @submit.prevent="saveTask">
          <!-- 基本信息 -->
          <div class="form-section">
            <h4 class="section-title">基本信息</h4>
            
            <div class="form-group">
              <label>任务名称</label>
              <input v-model="taskForm.title" required placeholder="例如：超级周挑战">
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>任务类型</label>
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
                    <span class="type-label">{{ type.label }}</span>
                    <span class="type-desc">{{ type.desc }}</span>
                  </button>
                </div>
              </div>
            </div>
            
            <div class="form-row">
              <div class="form-group">
                <label>任务图标</label>
                <select v-model="taskForm.icon">
                  <option v-for="icon in taskIcons" :key="icon.value" :value="icon.value">
                    {{ icon.value }} {{ icon.label }}
                  </option>
                </select>
              </div>
              <div class="form-group">
                <label>奖励积分</label>
                <input v-model.number="taskForm.reward_points" type="number" min="1" required>
              </div>
            </div>
            
            <div class="form-group">
              <label>任务描述</label>
              <textarea v-model="taskForm.description" rows="2" placeholder="任务详情说明..."></textarea>
            </div>
          </div>

          <!-- 动态配置：根据任务类型显示不同配置 -->
          <div class="form-section">
            <h4 class="section-title">任务配置</h4>
            
            <!-- 连续任务配置 -->
            <div v-if="taskForm.task_type === 'continuous'" class="dynamic-config">
              <div class="form-group">
                <label>目标连续天数</label>
                <input v-model.number="taskForm.target_streak" type="number" min="2" max="30" required>
                <small class="form-hint">连续完成指定天数后获得奖励</small>
              </div>
            </div>
            
            <!-- 累计任务配置 -->
            <div v-if="taskForm.task_type === 'cumulative'" class="dynamic-config">
              <div class="form-group">
                <label>目标完成次数</label>
                <input v-model.number="taskForm.target_count" type="number" min="1" max="100" required>
                <small class="form-hint">累计完成指定次数后获得奖励</small>
              </div>
            </div>
            
            <!-- 组合任务配置 -->
            <div v-if="taskForm.task_type === 'combo'" class="dynamic-config">
              <div class="form-group">
                <label>目标天数</label>
                <input v-model.number="taskForm.target_count" type="number" min="1" max="30" required>
                <small class="form-hint">连续多少天完成所有子项</small>
              </div>
              <div class="form-group">
                <label>关联行为规则</label>
                <div class="rule-selector">
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
                    <span class="rule-avatar">{{ rule.icon }}</span>
                    <span class="rule-name">{{ rule.name }}</span>
                  </label>
                </div>
                <small class="form-hint">选择需要同时完成的行为规则</small>
              </div>
            </div>
            
            <!-- 周期设置 (适用于连续、累计、组合任务) -->
            <div v-if="taskForm.task_type !== 'single'" class="form-row">
              <div class="form-group">
                <label>周期开始日期</label>
                <input v-model="taskForm.cycle_start" type="date" required>
              </div>
              <div class="form-group">
                <label>周期结束日期</label>
                <input v-model="taskForm.cycle_end" type="date" required>
              </div>
            </div>
          </div>

          <!-- 分配设置 -->
          <div class="form-section">
            <h4 class="section-title">分配设置</h4>
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
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeCreateModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : (editingTask ? '更新' : '发布') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 任务详情弹窗 -->
    <div v-if="showDetailModal && selectedTask" class="modal-overlay" @click.self="closeDetailModal">
      <div class="modal modal-large">
        <div class="modal-header">
          <h3>
            <span class="header-icon">{{ selectedTask.icon || getTaskTypeIcon(selectedTask.task_type) }}</span>
            {{ selectedTask.title }}
          </h3>
          <button class="close-btn" @click="closeDetailModal">&times;</button>
        </div>
        
        <div class="task-detail-content">
          <!-- 任务概览 -->
          <div class="detail-overview">
            <div class="overview-card">
              <span class="overview-label">任务类型</span>
              <span class="overview-value">{{ getTaskTypeText(selectedTask.task_type) }}</span>
            </div>
            <div class="overview-card">
              <span class="overview-label">当前状态</span>
              <span class="overview-value" :class="getTaskStatusClass(selectedTask)">
                {{ getTaskStatusLabel(selectedTask) }}
              </span>
            </div>
            <div class="overview-card">
              <span class="overview-label">奖励积分</span>
              <span class="overview-value points">+{{ selectedTask.reward_points }}</span>
            </div>
            <div class="overview-card" v-if="selectedTask.progress">
              <span class="overview-label">完成进度</span>
              <span class="overview-value">
                {{ getProgressPercent(selectedTask) }}%
              </span>
            </div>
          </div>

          <!-- 详细进度 -->
          <div class="detail-progress" v-if="selectedTask.progress">
            <h4>📊 进度详情</h4>
            
            <!-- 连续任务详情 -->
            <div v-if="selectedTask.task_type === 'continuous'" class="progress-detail">
              <div class="streak-stats">
                <div class="stat-item">
                  <span class="stat-value">{{ selectedTask.progress.streak_count || 0 }}</span>
                  <span class="stat-label">当前连续</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ selectedTask.target_streak || 7 }}</span>
                  <span class="stat-label">目标天数</span>
                </div>
                <div class="stat-item">
                  <span class="stat-value">{{ selectedTask.progress.longest_streak || 0 }}</span>
                  <span class="stat-label">最长记录</span>
                </div>
              </div>
            </div>

            <!-- 组合任务详情 -->
            <div v-if="selectedTask.task_type === 'combo'" class="combo-detail">
              <div class="combo-rules-detail">
                <h5>子项完成情况</h5>
                <div class="combo-rule-list">
                  <div 
                    v-for="rule in selectedTask.linked_rules" 
                    :key="rule.id"
                    class="combo-rule-row"
                  >
                    <span class="rule-icon">{{ rule.icon }}</span>
                    <span class="rule-name">{{ rule.name }}</span>
                    <span class="rule-status">
                      {{ isComboRuleCompleted(selectedTask, rule.id) ? '✅ 已完成' : '⬜ 待完成' }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 日历视图 -->
          <div class="detail-calendar">
            <h4>📅 完成日历</h4>
            <div class="calendar-grid">
              <div class="calendar-header">
                <span v-for="day in ['日', '一', '二', '三', '四', '五', '六']" :key="day">
                  {{ day }}
                </span>
              </div>
              <div class="calendar-body">
                <div 
                  v-for="(day, index) in calendarDays" 
                  :key="index"
                  class="calendar-day"
                  :class="{
                    'today': day.isToday,
                    'completed': day.isCompleted,
                    'in-range': day.isInRange,
                    'other-month': day.isOtherMonth
                  }"
                  @mouseenter="showDayDetail(day)"
                  @mouseleave="hideDayDetail"
                >
                  <span class="day-number">{{ day.date.getDate() }}</span>
                  <span v-if="day.isCompleted" class="day-check">✓</span>
                </div>
              </div>
            </div>
            
            <!-- 日期详情悬浮提示 -->
            <div v-if="hoveredDay" class="day-tooltip">
              <strong>{{ formatDate(hoveredDay.date) }}</strong>
              <p v-if="hoveredDay.isCompleted">✅ 已完成任务</p>
              <p v-else>⬜ 未完成任务</p>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="detail-actions">
            <button class="btn btn-secondary" @click="editTask(selectedTask)">
              ✏️ 编辑
            </button>
            <button 
              class="btn btn-danger" 
              @click="deleteTask(selectedTask)"
            >
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 完成动画 -->
    <div v-if="showCompletionAnimation" class="completion-animation">
      <div class="celebration">
        <span class="celebration-icon">🎉</span>
        <span class="celebration-icon">⭐</span>
        <span class="celebration-icon">🏆</span>
      </div>
      <h2>任务进度更新！</h2>
      <p>{{ completionMessage }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { supabase } from '../utils/supabase.js'
import { 
  TaskTypes, TaskStatus,
  checkTaskProgress, getChildTaskProgress,
  getTaskDetailWithProgress, createMockSuperWeekChallenge,
  getRemainingDays, formatProgress,
  getTaskStatusText, getTaskTypeText, getTaskTypeIcon
} from '../lib/tasks.js'

// ============================================
// 响应式数据
// ============================================

const tasks = ref([])
const children = ref([])
const availableRules = ref([])
const currentFilter = ref('all')
const hasMockData = ref(false)

// 弹窗控制
const showCreateModal = ref(false)
const showDetailModal = ref(false)
const editingTask = ref(null)
const selectedTask = ref(null)
const saving = ref(false)

// 动画控制
const showCompletionAnimation = ref(false)
const completionMessage = ref('')

// 日历相关
const calendarDays = ref([])
const hoveredDay = ref(null)
const taskHistory = ref([])

// 表单
const taskForm = reactive({
  title: '',
  task_type: 'single',
  reward_points: 10,
  icon: '📋',
  description: '',
  child_ids: [],
  target_count: 5,
  target_streak: 7,
  linked_rule_ids: [],
  cycle_start: '',
  cycle_end: ''
})

// ============================================
// 常量定义
// ============================================

const filterTabs = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'single', label: '单次', icon: '1️⃣' },
  { value: 'continuous', label: '连续', icon: '🔥' },
  { value: 'cumulative', label: '累计', icon: '📊' },
  { value: 'combo', label: '组合', icon: '🎯' }
]

const taskTypes = [
  { 
    value: 'single', 
    label: '单次任务', 
    icon: '1️⃣',
    desc: '完成一次即结束'
  },
  { 
    value: 'continuous', 
    label: '连续任务', 
    icon: '🔥',
    desc: '连续N天完成'
  },
  { 
    value: 'cumulative', 
    label: '累计任务', 
    icon: '📊',
    desc: '累计N次完成'
  },
  { 
    value: 'combo', 
    label: '组合挑战', 
    icon: '🎯',
    desc: '同时完成多个子项'
  }
]

const taskIcons = [
  { value: '📋', label: '默认' },
  { value: '🌅', label: '早起' },
  { value: '📚', label: '阅读' },
  { value: '🧹', label: '家务' },
  { value: '⚽', label: '运动' },
  { value: '🎨', label: '艺术' },
  { value: '🎹', label: '音乐' },
  { value: '🧮', label: '学习' },
  { value: '🥗', label: '健康' },
  { value: '💝', label: '爱心' },
  { value: '🏆', label: '成就' },
  { value: '⭐', label: '星星' },
  { value: '🎯', label: '目标' },
  { value: '🔥', label: '挑战' }
]

// ============================================
// 计算属性
// ============================================

const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return tasks.value
  return tasks.value.filter(t => t.task_type === currentFilter.value)
})

// ============================================
// 生命周期
// ============================================

onMounted(async () => {
  await loadChildren()
  await loadRules()
  await loadTasks()
  checkMockData()
})

// ============================================
// 数据加载
// ============================================

async function loadChildren() {
  const { data } = await supabase.from('children').select('*').order('name')
  children.value = data || []
}

async function loadRules() {
  const { data } = await supabase.from('rules').select('*').eq('is_active', true)
  availableRules.value = data || []
}

async function loadTasks() {
  try {
    // 获取任务列表
    const { data: tasksData, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (error) throw error
    
    // 为每个任务获取进度和关联数据
    const tasksWithDetails = await Promise.all(
      (tasksData || []).map(async (task) => {
        // 获取分配的孩子
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('child_id, children(id, name, avatar)')
          .eq('task_id', task.id)
        
        // 获取所有孩子的进度 (取第一个孩子的进度作为展示)
        const firstChildId = assignments?.[0]?.child_id
        let progress = null
        
        if (firstChildId) {
          const { data: progressData } = await supabase
            .from('task_progress')
            .select('*')
            .eq('task_id', task.id)
            .eq('child_id', firstChildId)
            .single()
          progress = progressData
        }
        
        // 获取组合任务的规则详情
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
          children: assignments?.map(a => a.children).filter(Boolean) || [],
          progress,
          linked_rules: linkedRules
        }
      })
    )
    
    tasks.value = tasksWithDetails
  } catch (error) {
    console.error('加载任务失败:', error)
  }
}

function checkMockData() {
  hasMockData.value = tasks.value.some(t => t.title === '超级周挑战')
}

// ============================================
// Mock数据创建
// ============================================

async function createMockData() {
  if (children.value.length === 0) {
    alert('请先添加一个孩子')
    return
  }
  
  const childId = children.value[0].id
  const userId = (await supabase.auth.getUser()).data.user?.id
  
  const result = await createMockSuperWeekChallenge(childId, userId)
  
  if (result.success) {
    alert('✅ 测试任务已创建！')
    await loadTasks()
    hasMockData.value = true
  } else {
    alert('❌ 创建失败: ' + result.error)
  }
}

// ============================================
// 任务详情弹窗
// ============================================

async function openTaskDetail(task) {
  selectedTask.value = task
  showDetailModal.value = true
  
  // 加载日历数据
  await loadCalendarData(task)
}

function closeDetailModal() {
  showDetailModal.value = false
  selectedTask.value = null
  taskHistory.value = []
}

async function loadCalendarData(task) {
  if (!task.progress) {
    generateCalendarDays([])
    return
  }
  
  // 获取完成历史
  const { data: history } = await supabase
    .from('task_completions')
    .select('*')
    .eq('task_id', task.id)
    .eq('child_id', task.children[0]?.id)
    .order('completion_date', { ascending: false })
  
  taskHistory.value = history || []
  generateCalendarDays(history || [])
}

function generateCalendarDays(history) {
  const days = []
  const today = new Date()
  const currentMonth = today.getMonth()
  const currentYear = today.getFullYear()
  
  // 获取当月第一天和最后一天
  const firstDay = new Date(currentYear, currentMonth, 1)
  const lastDay = new Date(currentYear, currentMonth + 1, 0)
  
  // 获取日历起始日（周日开始）
  const startDate = new Date(firstDay)
  startDate.setDate(startDate.getDate() - firstDay.getDay())
  
  // 生成42天（6周）
  const completedDates = new Set(history.map(h => h.completion_date))
  
  for (let i = 0; i < 42; i++) {
    const date = new Date(startDate)
    date.setDate(date.getDate() + i)
    
    const dateStr = date.toISOString().split('T')[0]
    
    days.push({
      date,
      isToday: date.toDateString() === today.toDateString(),
      isCompleted: completedDates.has(dateStr),
      isInRange: date.getMonth() === currentMonth,
      isOtherMonth: date.getMonth() !== currentMonth
    })
  }
  
  calendarDays.value = days
}

function showDayDetail(day) {
  hoveredDay.value = day
}

function hideDayDetail() {
  hoveredDay.value = null
}

function formatDate(date) {
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

// ============================================
// 表单操作
// ============================================

function selectTaskType(type) {
  taskForm.task_type = type
  
  // 设置默认值
  switch (type) {
    case 'continuous':
      taskForm.target_streak = 7
      break
    case 'cumulative':
      taskForm.target_count = 5
      break
    case 'combo':
      taskForm.target_count = 7
      taskForm.linked_rule_ids = []
      break
  }
}

function openCreateModal() {
  editingTask.value = null
  resetForm()
  
  // 设置默认日期
  const today = new Date()
  const weekLater = new Date(today)
  weekLater.setDate(weekLater.getDate() + 7)
  
  taskForm.cycle_start = today.toISOString().split('T')[0]
  taskForm.cycle_end = weekLater.toISOString().split('T')[0]
  
  showCreateModal.value = true
}

function closeCreateModal() {
  showCreateModal.value = false
  editingTask.value = null
  resetForm()
}

function resetForm() {
  taskForm.title = ''
  taskForm.task_type = 'single'
  taskForm.reward_points = 10
  taskForm.icon = '📋'
  taskForm.description = ''
  taskForm.child_ids = []
  taskForm.target_count = 5
  taskForm.target_streak = 7
  taskForm.linked_rule_ids = []
  taskForm.cycle_start = ''
  taskForm.cycle_end = ''
}

function editTask(task) {
  editingTask.value = task
  taskForm.title = task.title
  taskForm.task_type = task.task_type || 'single'
  taskForm.reward_points = task.reward_points || task.points
  taskForm.icon = task.icon || '📋'
  taskForm.description = task.description || ''
  taskForm.child_ids = task.children?.map(c => c.id) || []
  taskForm.target_count = task.target_count || 5
  taskForm.target_streak = task.target_streak || 7
  taskForm.linked_rule_ids = task.linked_rule_ids || []
  taskForm.cycle_start = task.cycle_start || ''
  taskForm.cycle_end = task.cycle_end || ''
  
  showCreateModal.value = true
  closeDetailModal()
}

async function saveTask() {
  saving.value = true
  try {
    const taskData = {
      title: taskForm.title,
      task_type: taskForm.task_type,
      reward_points: taskForm.reward_points,
      points: taskForm.reward_points,
      icon: taskForm.icon,
      description: taskForm.description,
      target_count: taskForm.task_type !== 'single' ? taskForm.target_count : null,
      target_streak: taskForm.task_type === 'continuous' ? taskForm.target_streak : null,
      linked_rule_ids: taskForm.task_type === 'combo' ? taskForm.linked_rule_ids : [],
      cycle_start: taskForm.task_type !== 'single' ? taskForm.cycle_start : null,
      cycle_end: taskForm.task_type !== 'single' ? taskForm.cycle_end : null,
      status: 'active'
    }
    
    if (editingTask.value) {
      // 更新任务
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingTask.value.id)
      
      if (error) throw error
      
      // 更新分配
      await supabase.from('task_assignments').delete().eq('task_id', editingTask.value.id)
      if (taskForm.child_ids.length > 0) {
        const assignments = taskForm.child_ids.map(childId => ({
          task_id: editingTask.value.id,
          child_id: childId
        }))
        await supabase.from('task_assignments').insert(assignments)
      }
    } else {
      // 创建任务
      const { data: newTask, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
        .single()
      
      if (error) throw error
      
      // 分配孩子
      if (taskForm.child_ids.length > 0) {
        const assignments = taskForm.child_ids.map(childId => ({
          task_id: newTask.id,
          child_id: childId
        }))
        await supabase.from('task_assignments').insert(assignments)
      }
      
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
    closeCreateModal()
  } catch (error) {
    alert('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

async function deleteTask(task) {
  if (!confirm(`确定要删除任务"${task.title}"吗？`)) return
  
  await supabase.from('tasks').delete().eq('id', task.id)
  await loadTasks()
  closeDetailModal()
}

// ============================================
// 辅助函数
// ============================================

function getTaskTypeClass(type) {
  return type || 'single'
}

function getTaskStatusClass(task) {
  if (!task.progress) return 'pending'
  return task.progress.status
}

function getTaskStatusLabel(task) {
  if (!task.progress) return '未开始'
  return getTaskStatusText(task.progress.status)
}

function getProgressPercent(task) {
  if (!task.progress) return 0
  
  switch (task.task_type) {
    case 'continuous':
      return formatProgress(task.progress.streak_count, task.target_streak)
    case 'cumulative':
    case 'combo':
      return formatProgress(task.progress.current_count, task.target_count)
    default:
      return task.progress.status === 'completed' ? 100 : 0
  }
}

function isExpiringSoon(task) {
  if (!task.cycle_end) return false
  const days = getRemainingDays(task.cycle_end)
  return days !== null && days <= 3 && days > 0
}

function isComboRuleCompleted(task, ruleId) {
  if (!task.progress?.combo_progress) return false
  return task.progress.combo_progress[ruleId]?.completed || false
}

// 导出任务类型工具函数供模板使用
const getTaskTypeTextRef = getTaskTypeText
const getTaskTypeIconRef = getTaskTypeIcon
const getTaskStatusTextRef = getTaskStatusText
const formatProgressRef = formatProgress
const getRemainingDaysRef = getRemainingDays
</script>

<style scoped>
/* ============================================
   基础布局
   ============================================ */

.tasks-page {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
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

.plus-icon {
  font-size: 1.3rem;
  font-weight: 700;
}

/* Mock数据横幅 */
.mock-banner {
  background: linear-gradient(135deg, #fff3bf 0%, #ffe066 100%);
  border-radius: 12px;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.btn-mock {
  background: #fab005;
  color: #333;
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
}

/* ============================================
   过滤器
   ============================================ */

.filter-bar {
  margin-bottom: 24px;
}

.filter-tabs {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  border: 2px solid #e9ecef;
  border-radius: 30px;
  cursor: pointer;
  font-weight: 600;
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

/* ============================================
   任务卡片
   ============================================ */

.tasks-flow {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 20px;
}

.task-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  position: relative;
  transition: all 0.3s;
  border-left: 5px solid #dee2e6;
  cursor: pointer;
}

.task-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(0,0,0,0.15);
}

/* 任务类型颜色 */
.task-card.single {
  border-left-color: #4facfe;
}
.task-card.continuous {
  border-left-color: #fa709a;
}
.task-card.cumulative {
  border-left-color: #43e97b;
}
.task-card.combo {
  border-left-color: #feca57;
}

/* 状态徽章 */
.task-status-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 700;
}

.task-status-badge.active {
  background: #d3f9d8;
  color: #2b8a3e;
}

.task-status-badge.completed {
  background: #e7f5ff;
  color: #1971c2;
}

.task-status-badge.failed,
.task-status-badge.expired {
  background: #ffe3e3;
  color: #c92a2a;
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
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.task-icon {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  background: #f8f9fa;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.task-info {
  flex: 1;
}

.task-title {
  margin: 0 0 8px 0;
  font-size: 1.15rem;
  color: #333;
}

.task-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 10px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 600;
}

.type-tag.single {
  background: #e7f5ff;
  color: #1971c2;
}

.type-tag.continuous {
  background: #ffe0e0;
  color: #c92a2a;
}

.type-tag.cumulative {
  background: #d3f9d8;
  color: #2b8a3e;
}

.type-tag.combo {
  background: #fff3bf;
  color: #f08c00;
}

.warning-tag {
  background: #ffe3e3;
  color: #c92a2a;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.task-points {
  text-align: center;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 10px 16px;
  border-radius: 12px;
  min-width: 70px;
}

.points-value {
  display: block;
  font-size: 1.3rem;
  font-weight: 800;
}

.points-label {
  font-size: 0.7rem;
  opacity: 0.9;
}

.task-desc {
  color: #495057;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

/* ============================================
   进度可视化
   ============================================ */

.task-progress-section {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.progress-label {
  font-weight: 600;
  color: #495057;
}

.progress-value {
  font-weight: 700;
  color: #667eea;
}

.progress-bar {
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  border-radius: 5px;
  transition: width 0.5s ease;
}

.streak-fill {
  background: linear-gradient(90deg, #fa709a, #fee140);
}

.cumulative-fill {
  background: linear-gradient(90deg, #43e97b, #38f9d7);
}

/* 火焰序列 */
.streak-flames {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.flame {
  font-size: 1.2rem;
  transition: all 0.3s;
}

.flame.active {
  animation: flicker 1s ease-in-out infinite alternate;
}

@keyframes flicker {
  from { transform: scale(1); }
  to { transform: scale(1.1); }
}

/* 进度点阵 */
.progress-dots {
  display: flex;
  gap: 8px;
  align-items: center;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #dee2e6;
  transition: all 0.3s;
}

.dot.filled {
  background: linear-gradient(135deg, #43e97b, #38f9d7);
  transform: scale(1.2);
}

.more-dots {
  color: #868e96;
  font-size: 0.8rem;
}

/* ============================================
   组合任务矩阵
   ============================================ */

.combo-matrix {
  padding: 12px;
}

.combo-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.combo-label {
  font-weight: 600;
}

.combo-value {
  font-weight: 700;
  color: #667eea;
}

.combo-rules {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
}

.combo-rule-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px;
  background: white;
  border-radius: 12px;
  border: 2px solid #e9ecef;
  transition: all 0.3s;
}

.combo-rule-item.completed {
  border-color: #51cf66;
  background: #d3f9d8;
}

.rule-icon {
  font-size: 1.5rem;
}

.rule-status {
  font-size: 1.2rem;
}

.rule-name {
  font-size: 0.75rem;
  color: #495057;
  text-align: center;
}

/* 天数进度 */
.days-progress {
  margin-top: 12px;
}

.days-track {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding: 4px;
}

.day-marker {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #e9ecef;
  border-radius: 50%;
  font-size: 0.8rem;
  font-weight: 600;
  color: #868e96;
  flex-shrink: 0;
}

.day-marker.completed {
  background: linear-gradient(135deg, #667eea, #764ba2);
  color: white;
}

/* ============================================
   单次任务状态
   ============================================ */

.single-status {
  text-align: center;
  padding: 20px;
}

.completed-badge {
  display: inline-block;
  background: #d3f9d8;
  color: #2b8a3e;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: 600;
}

.pending-badge {
  display: inline-block;
  background: #fff3bf;
  color: #f08c00;
  padding: 10px 20px;
  border-radius: 20px;
  font-weight: 600;
}

/* ============================================
   底部信息
   ============================================ */

.task-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid #e9ecef;
}

.task-assignees {
  display: flex;
  align-items: center;
  gap: 8px;
}

.assignee-label {
  font-size: 0.8rem;
  color: #868e96;
}

.assignee-avatars {
  display: flex;
}

.assignee-avatar {
  font-size: 1.3rem;
  width: 32px;
  height: 32px;
  background: white;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8px;
}

.assignee-avatar:first-child {
  margin-left: 0;
}

.assignee-more {
  font-size: 0.7rem;
  width: 32px;
  height: 32px;
  background: #dee2e6;
  border: 2px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: -8px;
  font-weight: 600;
  color: #495057;
}

.task-deadline {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.85rem;
  color: #868e96;
}

.task-deadline .urgent {
  color: #e03131;
  font-weight: 600;
}

/* ============================================
   弹窗样式
   ============================================ */

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
  overflow-y: auto;
}

.modal {
  background: white;
  border-radius: 20px;
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-large {
  max-width: 700px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px 24px 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  display: flex;
  align-items: center;
  gap: 10px;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #868e96;
  padding: 4px;
}

/* 表单样式 */
form {
  padding: 24px;
}

.form-section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: #868e96;
  margin-bottom: 16px;
  padding-bottom: 8px;
  border-bottom: 2px solid #e9ecef;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #495057;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 12px;
  border: 2px solid #e9ecef;
  border-radius: 10px;
  font-size: 1rem;
  transition: border-color 0.3s;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #667eea;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: #868e96;
}

/* 任务类型选择器 */
.type-selector {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px 12px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
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
  font-size: 1.5rem;
}

.type-label {
  font-weight: 600;
  font-size: 0.9rem;
}

.type-desc {
  font-size: 0.75rem;
  opacity: 0.8;
}

/* 规则选择器 */
.rule-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.rule-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s;
}

.rule-checkbox:hover {
  border-color: #667eea;
}

.rule-checkbox.checked {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.rule-checkbox input {
  display: none;
}

.rule-avatar {
  font-size: 1.2rem;
}

.rule-name {
  font-size: 0.85rem;
  font-weight: 500;
}

/* 孩子选择器 */
.child-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.child-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 30px;
  cursor: pointer;
  transition: all 0.3s;
}

.child-checkbox:hover {
  border-color: #667eea;
}

.child-checkbox.checked {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-color: transparent;
}

.child-checkbox input {
  display: none;
}

.child-avatar {
  font-size: 1.3rem;
}

.child-name {
  font-size: 0.9rem;
  font-weight: 500;
}

/* 按钮 */
.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e9ecef;
}

.btn {
  padding: 12px 24px;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  border: none;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.btn-secondary {
  background: #e9ecef;
  color: #495057;
}

.btn-danger {
  background: #ffe3e3;
  color: #c92a2a;
}

.btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* ============================================
   任务详情弹窗内容
   ============================================ */

.task-detail-content {
  padding: 24px;
}

.detail-overview {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.overview-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 16px;
  text-align: center;
}

.overview-label {
  display: block;
  font-size: 0.8rem;
  color: #868e96;
  margin-bottom: 8px;
}

.overview-value {
  display: block;
  font-size: 1.1rem;
  font-weight: 700;
  color: #333;
}

.overview-value.points {
  color: #40c057;
}

.detail-progress {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
}

.detail-progress h4 {
  margin: 0 0 16px 0;
}

/* 连续任务统计 */
.streak-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.stat-value {
  display: block;
  font-size: 1.5rem;
  font-weight: 800;
  color: #667eea;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: #868e96;
}

/* 组合任务详情 */
.combo-detail h5 {
  margin: 0 0 12px 0;
}

.combo-rule-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.combo-rule-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border-radius: 10px;
}

.combo-rule-row .rule-icon {
  font-size: 1.5rem;
}

.combo-rule-row .rule-name {
  flex: 1;
  font-weight: 500;
}

.combo-rule-row .rule-status {
  font-size: 0.85rem;
}

/* ============================================
   日历视图
   ============================================ */

.detail-calendar {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  position: relative;
}

.detail-calendar h4 {
  margin: 0 0 16px 0;
}

.calendar-grid {
  background: white;
  border-radius: 12px;
  overflow: hidden;
}

.calendar-header {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  background: #e9ecef;
  padding: 12px 0;
}

.calendar-header span {
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #495057;
}

.calendar-body {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.calendar-day {
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 1px solid #f1f3f5;
  cursor: pointer;
  transition: all 0.2s;
  position: relative;
}

.calendar-day:hover {
  background: #e7f5ff;
}

.calendar-day.today {
  background: #fff3bf;
  font-weight: 700;
}

.calendar-day.completed {
  background: #d3f9d8;
}

.calendar-day.completed .day-check {
  position: absolute;
  bottom: 2px;
  font-size: 0.7rem;
  color: #2b8a3e;
}

.calendar-day.other-month {
  color: #adb5bd;
  background: #f8f9fa;
}

.day-number {
  font-size: 0.9rem;
}

/* 日期提示 */
.day-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #333;
  color: white;
  padding: 8px 12px;
  border-radius: 8px;
  font-size: 0.85rem;
  white-space: nowrap;
  z-index: 10;
  margin-bottom: 8px;
}

.day-tooltip::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  transform: translateX(-50%);
  border: 6px solid transparent;
  border-top-color: #333;
}

.detail-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

/* ============================================
   空状态
   ============================================ */

.empty-state {
  text-align: center;
  padding: 80px 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.empty-illustration {
  margin-bottom: 24px;
}

.empty-emoji {
  font-size: 5rem;
}

.empty-state h3 {
  font-size: 1.4rem;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  color: #868e96;
}

/* ============================================
   完成动画
   ============================================ */

.completion-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: fadeIn 0.3s;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.celebration {
  display: flex;
  gap: 20px;
  margin-bottom: 24px;
}

.celebration-icon {
  font-size: 4rem;
  animation: celebrate 0.5s ease-out infinite alternate;
}

.celebration-icon:nth-child(2) {
  animation-delay: 0.1s;
}

.celebration-icon:nth-child(3) {
  animation-delay: 0.2s;
}

@keyframes celebrate {
  from { transform: scale(1) rotate(-10deg); }
  to { transform: scale(1.3) rotate(10deg); }
}

.completion-animation h2 {
  color: white;
  font-size: 2rem;
  margin-bottom: 12px;
}

.completion-animation p {
  color: #38ef7d;
  font-size: 1.2rem;
  font-weight: 600;
}

/* ============================================
   响应式设计
   ============================================ */

@media (max-width: 768px) {
  .tasks-flow {
    grid-template-columns: 1fr;
  }
  
  .filter-tabs {
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 8px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .type-selector {
    grid-template-columns: 1fr;
  }
  
  .detail-overview {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .streak-stats {
    grid-template-columns: 1fr;
  }
  
  .modal-large {
    max-width: 100%;
    margin: 10px;
  }
}
</style>
