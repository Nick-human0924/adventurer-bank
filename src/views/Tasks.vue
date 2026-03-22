<template>
  <div class="tasks-page">
    <div class="page-header">
      <h2>🎯 任务与闯关</h2>
      <button class="btn btn-primary" @click="showAddModal = true">
        <span>+</span> 发布任务
      </button>
    </div>

    <!-- 任务统计 -->
    <div class="stats-grid">
      <div class="stat-card">
        <div class="stat-icon blue">📋</div>
        <div class="stat-content">
          <h3>进行中</h3>
          <div class="number">{{ activeTasks.length }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon green">✅</div>
        <div class="stat-content">
          <h3>今日完成</h3>
          <div class="number">{{ todayCompleted }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon orange">🏆</div>
        <div class="stat-content">
          <h3>累计完成</h3>
          <div class="number">{{ totalCompleted }}</div>
        </div>
      </div>
      <div class="stat-card">
        <div class="stat-icon purple">💎</div>
        <div class="stat-content">
          <h3>今日积分</h3>
          <div class="number">{{ todayPoints }}</div>
        </div>
      </div>
    </div>

    <!-- 任务列表 -->
    <div class="tasks-section">
      <div class="section-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'daily' }]"
          @click="activeTab = 'daily'"
      >
          📅 日常任务
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'challenge' }]"
          @click="activeTab = 'challenge'"
        >
          🏆 挑战任务
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'streak' }]"
          @click="activeTab = 'streak'"
        >
          🔥 连续挑战
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'completed' }]"
          @click="activeTab = 'completed'"
        >
          ✅ 已完成
        </button>
      </div>

      <div class="tasks-list">
        <div 
          v-for="task in filteredTasks" 
          :key="task.id"
          :class="['task-card', task.status, task.type]"
        >
          <div class="task-header">
            <div class="task-icon">{{ task.icon || '📋' }}</div>
            <div class="task-info">
              <h4>{{ task.title }}</h4>
              <p class="task-desc">{{ task.description }}</p>
              <div class="task-meta">
                <span class="task-type">{{ 
                  task.type === 'daily' ? '📅 日常' : 
                  task.type === 'challenge' ? '🏆 挑战' : 
                  '🔥 连续' 
                }}</span>
                <span class="task-points">+{{ task.points }} 积分</span>
                <span v-if="task.due_date" class="task-due">⏰ {{ formatDate(task.due_date) }}</span>
              </div>
            </div>
          </div>

          <div class="task-assignees">
            <div 
              v-for="child in task.children" 
              :key="child.id"
              :class="['assignee', { completed: child.completed }]"
            >
              <span class="avatar">{{ child.avatar || '👶' }}</span>
              <span class="name">{{ child.name }}</span>
              <button 
                v-if="!child.completed"
                class="btn-complete"
                @click="completeTask(task, child)"
              >
                完成
              </button>
              <span v-else class="completed-badge">✅</span>
            </div>
          </div>

          <!-- 连续挑战进度日历 -->
          <div v-if="task.type === 'streak' && task.progress" class="streak-progress">
            <div class="progress-header">
              <span class="progress-title">📅 进度追踪</span>
              <span class="progress-count">{{ task.completedDays || 0 }}/{{ task.duration_days }} 天</span>
            </div>
            <div class="progress-calendar">
              <div 
                v-for="(day, index) in task.progress" 
                :key="index"
                :class="['day-cell', { completed: day.completed, today: day.isToday }]"
                :title="day.date"
              >
                <span class="day-number">{{ index + 1 }}</span>
                <span class="day-status">{{ day.completed ? '✅' : '○' }}</span>
              </div>
            </div>
          </div>

          <div class="task-actions">
            <button class="btn-icon" @click="editTask(task)" title="编辑">✏️</button>
            <button class="btn-icon" @click="deleteTask(task.id)" title="删除">🗑️</button>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredTasks.length === 0" class="empty-state">
          <div class="empty-icon">📝</div>
          <p>{{ emptyMessage }}</p>
          <button v-if="activeTab !== 'completed'" class="btn btn-primary" @click="showAddModal = true">
            发布第一个任务
          </button>
        </div>
      </div>
    </div>

    <!-- 添加/编辑任务弹窗 -->
    <div v-if="showAddModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEditing ? '编辑任务' : '发布任务' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>任务类型</label>
            <div class="type-selector">
              <button 
                :class="['type-btn', { active: form.type === 'daily' }]"
                @click="form.type = 'daily'"
              >
                📅 日常任务
              </button>
              <button 
                :class="['type-btn', { active: form.type === 'challenge' }]"
                @click="form.type = 'challenge'"
              >
                🏆 挑战任务
              </button>
              <button 
                :class="['type-btn', { active: form.type === 'streak' }]"
                @click="form.type = 'streak'"
              >
                🔥 连续挑战
              </button>
            </div>
          </div>

          <!-- 连续挑战特有字段 -->
          <div v-if="form.type === 'streak'" class="streak-fields">
            <div class="form-row">
              <div class="form-group">
                <label>开始日期 *</label>
                <input v-model="form.start_date" type="date" />
              </div>
              <div class="form-group">
                <label>持续天数 *</label>
                <input v-model.number="form.duration_days" type="number" min="2" max="30" />
              </div>
            </div>
            <p class="hint">需要连续 {{ form.duration_days }} 天完成才能获得奖励</p>
          </div>

          <div class="form-group">
            <label>任务标题 *</label>
            <input v-model="form.title" type="text" placeholder="例如：整理房间" />
          </div>

          <div class="form-group">
            <label>任务描述</label>
            <textarea v-model="form.description" rows="3" placeholder="详细描述任务要求..."></textarea>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>积分奖励 *</label>
              <input v-model.number="form.points" type="number" min="1" />
            </div>
            <div class="form-group">
              <label>截止日期</label>
              <input v-model="form.due_date" type="date" />
            </div>
          </div>

          <div class="form-group">
            <label>选择图标</label>
            <div class="icon-selector">
              <span 
                v-for="icon in iconOptions" 
                :key="icon"
                :class="['icon-option', { active: form.icon === icon }]"
                @click="form.icon = icon"
              >
                {{ icon }}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label>分配给</label>
            <div class="child-selector">
              <label 
                v-for="child in allChildren" 
                :key="child.id"
                class="child-checkbox"
              >
                <input 
                  type="checkbox" 
                  :value="child.id"
                  v-model="form.child_ids"
                />
                <span class="avatar">{{ child.avatar || '👶' }}</span>
                <span>{{ child.name }}</span>
              </label>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveTask" :disabled="!form.title || form.points < 1">
            {{ isEditing ? '保存' : '发布' }}
          </button>
        </div>
      </div>
    </div>

    <!-- 完成确认弹窗 -->
    <div v-if="showCompleteModal" class="modal-overlay" @click.self="showCompleteModal = false">
      <div class="modal">
        <div class="modal-header">
          <h3>确认完成任务</h3>
          <button class="close-btn" @click="showCompleteModal = false">×</button>
        </div>

        <div class="modal-body">
          <p v-if="completingTask">
            确认 <strong>{{ completingChild?.name }}</strong> 完成了任务
            <strong>"{{ completingTask?.title }}"</strong>？
          </p>
          <p class="points-info">
            将获得 <span class="points">+{{ completingTask?.points }}</span> 积分
          </p>
        </div>

        <div class="modal-footer">
          <button class="btn" @click="showCompleteModal = false">取消</button>
          <button class="btn btn-success" @click="confirmComplete">确认完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../utils/supabase.js'

const tasks = ref([])
const allChildren = ref([])
const activeTab = ref('daily')
const showAddModal = ref(false)
const showCompleteModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const completingTask = ref(null)
const completingChild = ref(null)

const iconOptions = ['📋', '✅', '🏆', '📚', '🧹', '🎨', '🏃', '🎵', '🤝', '💪', '🧠', '🎯', '⭐']

const form = ref({
  type: 'daily',
  title: '',
  description: '',
  points: 5,
  due_date: '',
  icon: '📋',
  child_ids: [],
  start_date: '',
  duration_days: 7
})

// 过滤任务
const filteredTasks = computed(() => {
  if (activeTab.value === 'completed') {
    return tasks.value.filter(t => t.status === 'completed')
  }
  return tasks.value.filter(t => {
    if (t.type !== activeTab.value) return false
    if (activeTab.value === 'completed') return t.status === 'completed'
    return t.status !== 'completed'
  })
})

const activeTasks = computed(() => tasks.value.filter(t => t.status !== 'completed'))

const emptyMessage = computed(() => {
  const messages = {
    daily: '还没有日常任务，发布一个吧！',
    challenge: '还没有挑战任务，发布一个吧！',
    streak: '还没有连续挑战，发布一个吧！',
    completed: '还没有已完成的任务'
  }
  return messages[activeTab.value]
})

// 今日统计
const todayCompleted = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.filter(t => {
    if (t.status !== 'completed') return false
    const completedDate = t.completed_at?.split('T')[0]
    return completedDate === today
  }).length
})

const todayPoints = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return tasks.value.reduce((sum, t) => {
    if (t.status !== 'completed') return sum
    const completedDate = t.completed_at?.split('T')[0]
    if (completedDate === today) return sum + (t.points || 0)
    return sum
  }, 0)
})

const totalCompleted = computed(() => tasks.value.filter(t => t.status === 'completed').length)

// 加载任务
async function loadTasks() {
  try {
    const { data: tasksData, error: tasksError } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (tasksError) {
      console.error('加载任务失败:', tasksError)
      return
    }

    // 获取任务分配的孩子
    const tasksWithChildren = await Promise.all(
      (tasksData || []).map(async (task) => {
        const { data: assignments } = await supabase
          .from('task_assignments')
          .select('child_id, completed, completed_at, children(*)')
          .eq('task_id', task.id)
        
        const allCompleted = assignments?.every(a => a.completed) || false
        
        // 加载进度（仅连续挑战）
        let progress = null
        let completedDays = 0
        if (task.type === 'streak') {
          const { data: progressData } = await supabase
            .from('challenge_progress')
            .select('*')
            .eq('task_id', task.id)
            .order('day_number', { ascending: true })
          
          if (progressData) {
            const today = new Date().toISOString().split('T')[0]
            progress = progressData.map(p => ({
              ...p,
              isToday: p.progress_date === today
            }))
            completedDays = progressData.filter(p => p.completed).length
          }
        }
        
        return {
          ...task,
          children: assignments?.map(a => ({
            id: a.child_id,
            name: a.children?.name,
            avatar: a.children?.avatar,
            completed: a.completed,
            completed_at: a.completed_at
          })) || [],
          status: allCompleted ? 'completed' : 'active',
          progress,
          completedDays
        }
      })
    )
    
    tasks.value = tasksWithChildren
  } catch (e) {
    console.error('加载任务异常:', e)
  }
}

// 加载孩子
async function loadChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('加载孩子失败:', error)
    return
  }
  
  allChildren.value = data || []
}

// 保存任务
async function saveTask() {
  if (!form.value.title || form.value.points < 1) return

  const taskData = {
    type: form.value.type,
    title: form.value.title,
    description: form.value.description,
    points: form.value.points,
    due_date: form.value.due_date || null,
    icon: form.value.icon,
    status: 'active'
  }

  // 连续挑战特有字段
  if (form.value.type === 'streak') {
    taskData.start_date = form.value.start_date
    taskData.duration_days = form.value.duration_days
    taskData.required_completions = form.value.duration_days
    // 计算结束日期
    if (form.value.start_date && form.value.duration_days) {
      const start = new Date(form.value.start_date)
      const end = new Date(start)
      end.setDate(start.getDate() + form.value.duration_days - 1)
      taskData.end_date = end.toISOString().split('T')[0]
    }
  }

  try {
    let taskId = editingId.value

    if (isEditing.value) {
      // 更新任务
      const { error } = await supabase
        .from('tasks')
        .update(taskData)
        .eq('id', editingId.value)
      
      if (error) throw error

      // 删除旧分配和进度
      await supabase.from('task_assignments').delete().eq('task_id', editingId.value)
      await supabase.from('challenge_progress').delete().eq('task_id', editingId.value)
    } else {
      // 创建任务
      const { data, error } = await supabase
        .from('tasks')
        .insert(taskData)
        .select()
      
      if (error) throw error
      taskId = data[0].id
    }

    // 分配给孩子
    if (form.value.child_ids.length > 0) {
      const assignments = form.value.child_ids.map(childId => ({
        task_id: taskId,
        child_id: childId,
        completed: false
      }))
      await supabase.from('task_assignments').insert(assignments)

      // 如果是连续挑战，初始化进度记录
      if (form.value.type === 'streak' && form.value.start_date && form.value.duration_days) {
        const progressRecords = []
        for (const childId of form.value.child_ids) {
          for (let i = 0; i < form.value.duration_days; i++) {
            const date = new Date(form.value.start_date)
            date.setDate(date.getDate() + i)
            progressRecords.push({
              task_id: taskId,
              child_id: childId,
              day_number: i + 1,
              progress_date: date.toISOString().split('T')[0],
              completed: false
            })
          }
        }
        if (progressRecords.length > 0) {
          await supabase.from('challenge_progress').insert(progressRecords)
        }
      }
    }

    closeModal()
    await loadTasks()
  } catch (error) {
    alert('保存失败: ' + error.message)
  }
}

// 编辑任务
function editTask(task) {
  isEditing.value = true
  editingId.value = task.id
  form.value = {
    type: task.type,
    title: task.title,
    description: task.description,
    points: task.points,
    due_date: task.due_date || '',
    icon: task.icon || '📋',
    child_ids: task.children?.map(c => c.id) || [],
    start_date: task.start_date || '',
    duration_days: task.duration_days || 7
  }
  showAddModal.value = true
}

// 删除任务
async function deleteTask(id) {
  if (!confirm('确定要删除这个任务吗？')) return

  try {
    // 先删除进度记录（如果有）
    await supabase.from('challenge_progress').delete().eq('task_id', id)
    // 删除分配
    await supabase.from('task_assignments').delete().eq('task_id', id)
    // 再删除任务
    await supabase.from('tasks').delete().eq('id', id)
    await loadTasks()
  } catch (error) {
    alert('删除失败: ' + error.message)
  }
}

// 完成任务
function completeTask(task, child) {
  completingTask.value = task
  completingChild.value = child
  showCompleteModal.value = true
}

// 确认完成
async function confirmComplete() {
  if (!completingTask.value || !completingChild.value) return

  try {
    // 连续挑战：更新当天进度
    if (completingTask.value.type === 'streak') {
      const today = new Date().toISOString().split('T')[0]
      
      // 查找今天的进度记录
      const { data: progressData } = await supabase
        .from('challenge_progress')
        .select('*')
        .eq('task_id', completingTask.value.id)
        .eq('child_id', completingChild.value.id)
        .eq('progress_date', today)
        .single()
      
      if (progressData && !progressData.completed) {
        // 更新今天为已完成
        await supabase
          .from('challenge_progress')
          .update({
            completed: true,
            completed_at: new Date().toISOString()
          })
          .eq('id', progressData.id)
        
        // 检查是否完成了所有天数
        const { data: allProgress } = await supabase
          .from('challenge_progress')
          .select('*')
          .eq('task_id', completingTask.value.id)
          .eq('child_id', completingChild.value.id)
        
        const allCompleted = allProgress?.every(p => p.completed)
        
        if (allCompleted) {
          // 完成整个挑战，更新任务分配状态为完成
          await supabase
            .from('task_assignments')
            .update({
              completed: true,
              completed_at: new Date().toISOString()
            })
            .eq('task_id', completingTask.value.id)
            .eq('child_id', completingChild.value.id)
          
          // 创建交易记录（奖励积分）
          await supabase.from('transactions').insert({
            child_id: completingChild.value.id,
            task_id: completingTask.value.id,
            points: completingTask.value.points,
            type: 'earn',
            note: `完成连续挑战: ${completingTask.value.title}`
          })
          
          // 更新孩子积分
          const { data: child } = await supabase
            .from('children')
            .select('current_balance, total_points')
            .eq('id', completingChild.value.id)
            .single()
          
          if (child) {
            await supabase.from('children').update({
              current_balance: child.current_balance + completingTask.value.points,
              total_points: child.total_points + completingTask.value.points
            }).eq('id', completingChild.value.id)
          }
          
          alert(`🎉 恭喜！${completingChild.value.name} 完成了连续挑战，获得 +${completingTask.value.points} 积分！`)
        } else {
          const completedCount = allProgress?.filter(p => p.completed).length || 0
          const totalCount = allProgress?.length || completingTask.value.duration_days
          alert(`✅ 今日打卡成功！进度: ${completedCount}/${totalCount} 天`)
        }
      } else if (progressData?.completed) {
        alert('今天已经打卡过了！')
      } else {
        alert('今天不在挑战日期范围内！')
      }
    } else {
      // 普通任务/挑战任务：直接完成
      const { error: assignmentError } = await supabase
        .from('task_assignments')
        .update({
          completed: true,
          completed_at: new Date().toISOString()
        })
        .eq('task_id', completingTask.value.id)
        .eq('child_id', completingChild.value.id)
      
      if (assignmentError) throw assignmentError

      // 创建交易记录
      await supabase.from('transactions').insert({
        child_id: completingChild.value.id,
        task_id: completingTask.value.id,
        points: completingTask.value.points,
        type: 'earn',
        note: `完成任务: ${completingTask.value.title}`
      })

      // 更新孩子积分
      const { data: child } = await supabase
        .from('children')
        .select('current_balance, total_points')
        .eq('id', completingChild.value.id)
        .single()

      if (child) {
        await supabase.from('children').update({
          current_balance: child.current_balance + completingTask.value.points,
          total_points: child.total_points + completingTask.value.points
        }).eq('id', completingChild.value.id)
      }
      
      alert(`✅ 任务完成！${completingChild.value.name} 获得 +${completingTask.value.points} 积分`)
    }

    showCompleteModal.value = false
    await loadTasks()
  } catch (error) {
    alert('完成任务失败: ' + error.message)
  }
}

// 关闭弹窗
function closeModal() {
  showAddModal.value = false
  isEditing.value = false
  editingId.value = null
  form.value = {
    type: 'daily',
    title: '',
    description: '',
    points: 5,
    due_date: '',
    icon: '📋',
    child_ids: [],
    start_date: '',
    duration_days: 7
  }
}

// 格式化日期
function formatDate(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

onMounted(() => {
  loadTasks()
  loadChildren()
})
</script>

<style scoped>
.tasks-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h2 {
  font-size: 1.5rem;
  color: #333;
}

.tasks-section {
  background: white;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0,0,0,0.08);
}

.section-tabs {
  display: flex;
  gap: 12px;
  margin-bottom: 24px;
  border-bottom: 2px solid #e9ecef;
  padding-bottom: 12px;
}

.tab-btn {
  padding: 10px 20px;
  border: none;
  background: transparent;
  color: #868e96;
  font-size: 1rem;
  cursor: pointer;
  border-radius: 8px;
  transition: all 0.3s;
}

.tab-btn:hover {
  background: #f8f9fa;
}

.tab-btn.active {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.tasks-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.task-card {
  background: #f8f9fa;
  border-radius: 12px;
  padding: 20px;
  border-left: 4px solid #667eea;
  transition: all 0.3s;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.task-card.challenge {
  border-left-color: #ff9f43;
  background: linear-gradient(135deg, #fff8f0 0%, #fff 100%);
}

.task-card.completed {
  border-left-color: #51cf66;
  opacity: 0.7;
}

.task-header {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.task-icon {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
}

.task-card.challenge .task-icon {
  background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%);
}

.task-info {
  flex: 1;
}

.task-info h4 {
  font-size: 1.1rem;
  margin-bottom: 6px;
  color: #333;
}

.task-desc {
  color: #868e96;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.task-meta {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.task-type {
  background: #e9ecef;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  color: #495057;
}

.task-points {
  background: #d3f9d8;
  color: #2b8a3e;
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
}

.task-due {
  color: #ff6b6b;
  font-size: 0.8rem;
}

.task-assignees {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: white;
  border-radius: 8px;
}

.assignee {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 20px;
}

.assignee.completed {
  background: #d3f9d8;
}

.assignee .avatar {
  font-size: 1.2rem;
}

.assignee .name {
  font-weight: 500;
}

.btn-complete {
  padding: 4px 12px;
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-size: 0.8rem;
  cursor: pointer;
  transition: all 0.3s;
}

.btn-complete:hover {
  transform: scale(1.05);
}

.completed-badge {
  color: #51cf66;
  font-size: 1.2rem;
}

.task-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}

.type-selector {
  display: flex;
  gap: 12px;
}

.type-btn {
  flex: 1;
  padding: 12px;
  border: 2px solid #e9ecef;
  background: white;
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.3s;
}

.type-btn.active {
  border-color: #667eea;
  background: #edf2ff;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.icon-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.child-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.child-checkbox {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: #f8f9fa;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
}

.child-checkbox:hover {
  background: #e9ecef;
}

.child-checkbox input {
  width: auto;
}

.points-info {
  text-align: center;
  margin-top: 16px;
  font-size: 1.1rem;
}

.points-info .points {
  color: #11998e;
  font-weight: 700;
  font-size: 1.3rem;
}

.empty-state {
  text-align: center;
  padding: 60px;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 16px;
}

/* 连续挑战样式 */
.streak-fields {
  background: #fff8f0;
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 16px;
}

.streak-fields .hint {
  color: #ff9f43;
  font-size: 0.85rem;
  margin-top: 8px;
}

.streak-progress {
  margin-top: 16px;
  padding: 16px;
  background: white;
  border-radius: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.progress-title {
  font-weight: 600;
  color: #333;
}

.progress-count {
  background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%);
  color: white;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 600;
}

.progress-calendar {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.day-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 2px solid transparent;
  transition: all 0.3s;
}

.day-cell.completed {
  background: #d3f9d8;
  border-color: #51cf66;
}

.day-cell.today {
  border-color: #ff9f43;
  background: #fff8f0;
}

.day-number {
  font-size: 0.75rem;
  color: #868e96;
  margin-bottom: 2px;
}

.day-status {
  font-size: 1rem;
}

.task-card.streak {
  border-left-color: #ff9f43;
  background: linear-gradient(135deg, #fff8f0 0%, #fff 100%);
}

.task-card.streak .task-icon {
  background: linear-gradient(135deg, #ff9f43 0%, #ff6b6b 100%);
}
</style>
