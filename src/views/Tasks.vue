<template>
  <div class="tasks-page">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🚩</span>
        <div class="header-text">
          <h2>任务与闯关</h2>
          <p>设置挑战目标，赢取丰厚奖励！</p>
        </div>
      </div>
      <button class="btn btn-primary create-task-btn" @click="openCreateModal">
        <span class="plus-icon">+</span>
        <span>发布新任务</span>
      </button>
    </div>

    <!-- 空状态：推荐任务模板 -->
    <div v-if="tasks.length === 0 && !showCreateModal" class="empty-state">
      <div class="empty-illustration">
        <span class="empty-emoji">🎯</span>
        <div class="floating-icons">
          <span>🏆</span>
          <span>⭐</span>
          <span>🎉</span>
        </div>
      </div>
      <h3>还没有任务？从模板开始吧！</h3>
      <p>选择一个推荐模板，快速创建第一个任务</p>
      
      <div class="template-cards">
        <div 
          v-for="template in taskTemplates" 
          :key="template.id"
          class="template-card"
          @click="selectTemplate(template)"
        >
          <div class="template-icon">{{ template.icon }}</div>
          <h4>{{ template.name }}</h4>
          <p>{{ template.desc }}</p>
          <div class="template-reward">
            <span class="points">+{{ template.points }}</span>
            <span class="difficulty" :class="template.difficulty">
              {{ template.difficultyText }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- 任务列表（卡片流布局） -->
    <div v-else class="tasks-container">
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

      <!-- 任务卡片流 -->
      <div class="tasks-flow">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          class="task-card"
          :class="[task.type, task.status]"
        >
          <!-- 任务状态标签 -->
          <div class="task-status-badge" :class="task.status">
            {{ getStatusText(task.status) }}
          </div>

          <!-- 任务头部 -->
          <div class="task-header">
            <div class="task-icon">{{ task.icon || getTaskIcon(task.type) }}</div>
            <div class="task-info">
              <h4 class="task-title">{{ task.title }}</h4>
              <div class="task-tags">
                <span class="tag type-tag" :class="task.type">
                  {{ getTypeText(task.type) }}
                </span>
                <span v-if="task.is_repeatable" class="tag repeat-tag">
                  🔄 可重复
                </span>
              </div>
            </div>
            <div class="task-points" :class="{ 'points-bounce': animatingTask === task.id }">
              +{{ task.points }}
            </div>
          </div>

          <!-- 任务描述 -->
          <p v-if="task.description" class="task-desc">{{ task.description }}</p>

          <!-- 任务进度（如果是连续任务） -->
          <div v-if="task.type === 'streak' && task.current_streak > 0" class="streak-progress">
            <div class="streak-bar">
              <div 
                class="streak-fill" 
                :style="{ width: Math.min((task.current_streak / task.target_streak) * 100, 100) + '%' }"
              ></div>
            </div>
            <span class="streak-text">
              🔥 连续 {{ task.current_streak }}/{{ task.target_streak }} 天
            </span>
          </div>

          <!-- 分配的孩子 -->
          <div v-if="task.children && task.children.length > 0" class="task-assignees">
            <span class="assignee-label">分配给：</span>
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

          <!-- 任务操作 -->
          <div class="task-actions">
            <button 
              v-if="task.status !== 'completed'"
              class="btn btn-complete"
              @click="completeTask(task)"
              :disabled="completingTask === task.id"
            >
              <span v-if="completingTask === task.id">⏳</span>
              <span v-else>✅ 完成任务</span>
            </button>
            <button v-else class="btn btn-completed" disabled>
              🎉 已完成
            </button>
            <button class="btn btn-edit" @click="editTask(task)">
              ✏️ 编辑
            </button>
            <button class="btn btn-delete" @click="deleteTask(task)">
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 创建/编辑任务弹窗 -->
    <div v-if="showCreateModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ editingTask ? '✏️ 编辑任务' : '📝 发布新任务' }}</h3>
          <button class="close-btn" @click="closeModal">&times;</button>
        </div>
        
        <form @submit.prevent="saveTask">
          <div class="form-group">
            <label>任务名称</label>
            <input v-model="taskForm.title" required placeholder="例如：早起挑战">
          </div>
          
          <div class="form-group">
            <label>任务类型</label>
            <div class="type-selector">
              <button 
                v-for="type in taskTypes" 
                :key="type.value"
                type="button"
                class="type-btn"
                :class="{ active: taskForm.type === type.value }"
                @click="taskForm.type = type.value"
              >
                <span class="type-icon">{{ type.icon }}</span>
                <span>{{ type.label }}</span>
              </button>
            </div>
          </div>
          
          <div class="form-row">
            <div class="form-group">
              <label>奖励积分</label>
              <input v-model.number="taskForm.points" type="number" min="1" required>
            </div>
            <div class="form-group">
              <label>任务图标</label>
              <select v-model="taskForm.icon">
                <option v-for="icon in taskIcons" :key="icon.value" :value="icon.value">
                  {{ icon.value }} {{ icon.label }}
                </option>
              </select>
            </div>
          </div>
          
          <!-- 连续任务设置 -->
          <div v-if="taskForm.type === 'streak'" class="form-group">
            <label>目标连续天数</label>
            <input v-model.number="taskForm.target_streak" type="number" min="2" max="30" required>
            <small class="form-hint">连续完成指定天数后获得奖励</small>
          </div>
          
          <div class="form-group">
            <label>任务描述</label>
            <textarea v-model="taskForm.description" rows="2" placeholder="任务详情说明...">
            </textarea>
          </div>
          
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
          
          <div class="form-group checkbox-group">
            <label class="checkbox-label">
              <input type="checkbox" v-model="taskForm.is_repeatable">
              <span>可重复完成（日常任务）</span>
            </label>
          </div>
          
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" @click="closeModal">取消</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? '保存中...' : (editingTask ? '更新' : '发布') }}
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- 完成动画 -->
    <div v-if="showCompletionAnimation" class="completion-animation">
      <div class="celebration">
        <span class="celebration-icon">🎉</span>
        <span class="celebration-icon">⭐</span>
        <span class="celebration-icon">🏆</span>
      </div>
      <h2>任务完成！</h2>
      <p>获得 +{{ completedTaskPoints }} 积分</p>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, reactive, computed } from 'vue'
import { supabase } from '../utils/supabase.js'

const tasks = ref([])
const children = ref([])
const showCreateModal = ref(false)
const editingTask = ref(null)
const saving = ref(false)
const completingTask = ref(null)
const animatingTask = ref(null)
const showCompletionAnimation = ref(false)
const completedTaskPoints = ref(0)
const currentFilter = ref('all')

// 任务模板
const taskTemplates = [
  { 
    id: 'early_bird', 
    name: '早起小鸟', 
    icon: '🌅', 
    desc: '每天7点前起床，养成早睡早起好习惯',
    points: 5,
    difficulty: 'easy',
    difficultyText: '简单',
    type: 'daily',
    is_repeatable: true
  },
  { 
    id: 'reading_time', 
    name: '阅读时光', 
    icon: '📚', 
    desc: '每天阅读30分钟，探索知识的海洋',
    points: 8,
    difficulty: 'medium',
    difficultyText: '中等',
    type: 'daily',
    is_repeatable: true
  },
  { 
    id: 'housework_master', 
    name: '家务小能手', 
    icon: '🧹', 
    desc: '完成一项家务任务，成为家庭好帮手',
    points: 10,
    difficulty: 'medium',
    difficultyText: '中等',
    type: 'challenge',
    is_repeatable: false
  },
  { 
    id: 'exercise_hero', 
    name: '运动健将', 
    icon: '⚽', 
    desc: '坚持运动7天，强健体魄',
    points: 15,
    difficulty: 'hard',
    difficultyText: '挑战',
    type: 'streak',
    target_streak: 7,
    is_repeatable: false
  }
]

// 过滤器
const filterTabs = [
  { value: 'all', label: '全部', icon: '📋' },
  { value: 'daily', label: '日常', icon: '📅' },
  { value: 'challenge', label: '挑战', icon: '🎯' },
  { value: 'streak', label: '连续', icon: '🔥' }
]

// 任务类型
const taskTypes = [
  { value: 'daily', label: '日常任务', icon: '📅' },
  { value: 'challenge', label: '挑战任务', icon: '🎯' },
  { value: 'streak', label: '连续任务', icon: '🔥' }
]

// 任务图标
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
  { value: '⭐', label: '星星' }
]

// 表单
const taskForm = reactive({
  title: '',
  type: 'daily',
  points: 5,
  icon: '📋',
  description: '',
  child_ids: [],
  is_repeatable: false,
  target_streak: 7
})

// 过滤后的任务
const filteredTasks = computed(() => {
  if (currentFilter.value === 'all') return tasks.value
  return tasks.value.filter(t => t.type === currentFilter.value)
})

// 加载任务
async function loadTasks() {
  const { data: tasksData } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  
  // 获取任务分配的孩子
  const tasksWithChildren = await Promise.all(
    (tasksData || []).map(async (task) => {
      const { data: assignments } = await supabase
        .from('task_assignments')
        .select('child_id, children(id, name, avatar)')
        .eq('task_id', task.id)
      
      return {
        ...task,
        children: assignments?.map(a => a.children).filter(Boolean) || []
      }
    })
  )
  
  tasks.value = tasksWithChildren
}

// 加载孩子列表
async function loadChildren() {
  const { data } = await supabase.from('children').select('*').order('name')
  children.value = data || []
}

// 选择模板
function selectTemplate(template) {
  taskForm.title = template.name
  taskForm.type = template.type
  taskForm.points = template.points
  taskForm.icon = template.icon
  taskForm.description = template.desc
  taskForm.is_repeatable = template.is_repeatable
  if (template.target_streak) {
    taskForm.target_streak = template.target_streak
  }
  showCreateModal.value = true
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
  resetForm()
}

// 重置表单
function resetForm() {
  taskForm.title = ''
  taskForm.type = 'daily'
  taskForm.points = 5
  taskForm.icon = '📋'
  taskForm.description = ''
  taskForm.child_ids = []
  taskForm.is_repeatable = false
  taskForm.target_streak = 7
}

// 编辑任务
function editTask(task) {
  editingTask.value = task
  taskForm.title = task.title
  taskForm.type = task.type
  taskForm.points = task.points
  taskForm.icon = task.icon || '📋'
  taskForm.description = task.description || ''
  taskForm.is_repeatable = task.is_repeatable || false
  taskForm.target_streak = task.target_streak || 7
  taskForm.child_ids = task.children?.map(c => c.id) || []
  showCreateModal.value = true
}

// 保存任务
async function saveTask() {
  saving.value = true
  try {
    const taskData = {
      title: taskForm.title,
      type: taskForm.type,
      points: taskForm.points,
      icon: taskForm.icon,
      description: taskForm.description,
      is_repeatable: taskForm.is_repeatable,
      target_streak: taskForm.type === 'streak' ? taskForm.target_streak : null
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
    }
    
    await loadTasks()
    closeModal()
  } catch (error) {
    alert('保存失败: ' + error.message)
  } finally {
    saving.value = false
  }
}

// 删除任务
async function deleteTask(task) {
  if (!confirm(`确定要删除任务"${task.title}"吗？`)) return
  
  await supabase.from('tasks').delete().eq('id', task.id)
  await loadTasks()
}

// 完成任务
async function completeTask(task) {
  if (!task.children || task.children.length === 0) {
    alert('请先分配孩子给这个任务')
    return
  }
  
  completingTask.value = task.id
  animatingTask.value = task.id
  
  try {
    // 为每个孩子创建交易记录
    for (const child of task.children) {
      await supabase.from('transactions').insert({
        child_id: child.id,
        points: task.points,
        type: 'earn',
        note: `完成任务: ${task.title}`,
        task_id: task.id
      })
    }
    
    // 如果不是可重复任务，标记为已完成
    if (!task.is_repeatable) {
      await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id)
    }
    
    // 显示完成动画
    completedTaskPoints.value = task.points
    showCompletionAnimation.value = true
    setTimeout(() => {
      showCompletionAnimation.value = false
    }, 2000)
    
    await loadTasks()
  } catch (error) {
    alert('完成任务失败: ' + error.message)
  } finally {
    completingTask.value = null
    setTimeout(() => {
      animatingTask.value = null
    }, 500)
  }
}

// 获取状态文本
function getStatusText(status) {
  const statusMap = {
    'pending': '进行中',
    'in_progress': '进行中',
    'completed': '已完成',
    'cancelled': '已取消'
  }
  return statusMap[status] || status
}

// 获取类型文本
function getTypeText(type) {
  const typeMap = {
    'daily': '日常',
    'challenge': '挑战',
    'streak': '连续'
  }
  return typeMap[type] || type
}

// 获取任务图标
function getTaskIcon(type) {
  const iconMap = {
    'daily': '📅',
    'challenge': '🎯',
    'streak': '🔥'
  }
  return iconMap[type] || '📋'
}

onMounted(() => {
  loadTasks()
  loadChildren()
})
</script>

<style scoped>
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

.plus-icon {
  font-size: 1.3rem;
  font-weight: 700;
}

/* 空状态 */
.empty-state {
  text-align: center;
  padding: 60px 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.empty-illustration {
  position: relative;
  display: inline-block;
  margin-bottom: 24px;
}

.empty-emoji {
  font-size: 5rem;
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
  font-size: 1.5rem;
  animation: float 2s ease-in-out infinite;
}

.floating-icons span:nth-child(1) {
  top: -10px;
  left: -30px;
  animation-delay: 0s;
}

.floating-icons span:nth-child(2) {
  top: -5px;
  right: -25px;
  animation-delay: 0.5s;
}

.floating-icons span:nth-child(3) {
  bottom: -10px;
  left: 50%;
  transform: translateX(-50%);
  animation-delay: 1s;
}

@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.empty-state h3 {
  font-size: 1.4rem;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  color: #868e96;
  margin-bottom: 32px;
}

/* 模板卡片 */
.template-cards {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.template-card {
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border: 2px solid #e9ecef;
  border-radius: 20px;
  padding: 24px;
  cursor: pointer;
  transition: all 0.3s;
}

.template-card:hover {
  border-color: #667eea;
  transform: translateY(-4px);
  box-shadow: 0 12px 30px rgba(102, 126, 234, 0.2);
}

.template-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.template-card h4 {
  margin: 0 0 8px 0;
  font-size: 1.1rem;
  color: #333;
}

.template-card p {
  margin: 0 0 16px 0;
  font-size: 0.85rem;
  color: #868e96;
  line-height: 1.5;
}

.template-reward {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-reward .points {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.95rem;
}

.difficulty {
  font-size: 0.8rem;
  padding: 4px 10px;
  border-radius: 12px;
  font-weight: 600;
}

.difficulty.easy {
  background: #d3f9d8;
  color: #2b8a3e;
}

.difficulty.medium {
  background: #fff3bf;
  color: #f08c00;
}

.difficulty.hard {
  background: #ffe3e3;
  color: #c92a2a;
}

/* 过滤器 */
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

/* 任务卡片流 */
.tasks-flow {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
  gap: 20px;
}

.task-card {
  background: white;
  border-radius: 20px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.08);
  position: relative;
  transition: all 0.3s;
  border-left: 4px solid #dee2e6;
}

.task-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(0,0,0,0.12);
}

.task-card.daily {
  border-left-color: #4facfe;
}

.task-card.challenge {
  border-left-color: #f093fb;
}

.task-card.streak {
  border-left-color: #fa709a;
}

.task-status-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: 700;
}

.task-status-badge.pending,
.task-status-badge.in_progress {
  background: #fff3bf;
  color: #f08c00;
}

.task-status-badge.completed {
  background: #d3f9d8;
  color: #2b8a3e;
}

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

.type-tag.daily {
  background: #e7f5ff;
  color: #1971c2;
}

.type-tag.challenge {
  background: #f3d9fa;
  color: #9c36b5;
}

.type-tag.streak {
  background: #ffe0e0;
  color: #c92a2a;
}

.repeat-tag {
  background: #d3f9d8;
  color: #2b8a3e;
}

.task-points {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  padding: 10px 18px;
  border-radius: 16px;
  font-weight: 800;
  font-size: 1.2rem;
  transition: transform 0.3s;
}

.task-points.points-bounce {
  animation: pointsBounce 0.5s ease-out;
}

@keyframes pointsBounce {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.3); }
}

.task-desc {
  color: #495057;
  font-size: 0.9rem;
  line-height: 1.6;
  margin-bottom: 16px;
}

/* 连续任务进度 */
.streak-progress {
  background: #fff5f5;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.streak-bar {
  height: 10px;
  background: #ffe0e0;
  border-radius: 5px;
  overflow: hidden;
  margin-bottom: 8px;
}

.streak-fill {
  height: 100%;
  background: linear-gradient(90deg, #ff6b6b, #ffa94d);
  border-radius: 5px;
  transition: width 0.5s ease;
}

.streak-text {
  font-size: 0.85rem;
  color: #c92a2a;
  font-weight: 600;
}

/* 分配的孩子 */
.task-assignees {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 12px;
}

.assignee-label {
  font-size: 0.85rem;
  color: #868e96;
}

.assignee-avatars {
  display: flex;
  gap: -8px;
}

.assignee-avatar {
  font-size: 1.5rem;
  width: 36px;
  height: 36px;
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
  font-size: 0.8rem;
  width: 36px;
  height: 36px;
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

/* 任务操作 */
.task-actions {
  display: flex;
  gap: 8px;
}

.task-actions .btn {
  flex: 1;
  padding: 10px 16px;
  font-size: 0.85rem;
}

.btn-complete {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
}

.btn-completed {
  background: #d3f9d8;
  color: #2b8a3e;
}

/* 完成动画 */
.completion-animation {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.8);
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
  font-size: 1.5rem;
  font-weight: 700;
}

/* 表单样式 */
.type-selector {
  display: flex;
  gap: 12px;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 16px;
  background: #f8f9fa;
  border: 2px solid #e9ecef;
  border-radius: 16px;
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
  font-size: 1.8rem;
}

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

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 0.8rem;
  color: #868e96;
}

@media (max-width: 768px) {
  .tasks-flow {
    grid-template-columns: 1fr;
  }
  
  .template-cards {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
}
</style>
