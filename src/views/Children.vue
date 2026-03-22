<template>
  <div class="children-page">
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🏆</span>
        <div class="header-text">
          <h2>英雄殿堂</h2>
          <p>管理你的小英雄，见证成长之路</p>
        </div>
      </div>
      <button class="btn btn-primary add-hero-btn" @click="showAddModal = true">
        <span class="plus-icon">+</span>
        <span>召唤新英雄</span>
      </button>
    </div>

    <!-- 英雄卡网格 -->
    <div class="heroes-grid">
      <div v-for="child in children" :key="child.id" class="hero-card" :class="'tier-' + getTier(child.total_points)">
        <!-- 等级标签 -->
        <div class="level-badge">
          <span class="level-text">LV.{{ getLevel(child.total_points) }}</span>
        </div>
        
        <!-- 英雄头像区域 -->
        <div class="hero-avatar-section">
          <div class="hero-avatar">
            <img 
              v-if="child.avatar && child.avatar.startsWith('data:')" 
              :src="child.avatar" 
              class="avatar-image"
              alt="头像"
            />
            <span v-else class="avatar-emoji">{{ child.avatar || '👶' }}</span>
            <div class="avatar-glow"></div>
          </div>
          <h3 class="hero-name">{{ child.name }}</h3>
          <div class="hero-title">{{ getTitle(child.total_points) }}</div>
        </div>
        
        <!-- 金币与进度 -->
        <div class="hero-stats">
          <div class="stat-row">
            <div class="stat-item">
              <span class="stat-label">💎 当前金币</span>
              <span class="stat-value current" :class="{ 'score-bounce': bouncingChild === child.id }">
                {{ child.current_balance }}
              </span>
            </div>
            <div class="stat-item">
              <span class="stat-label">⭐ 累计金币</span>
              <span class="stat-value total">{{ child.total_points }}</span>
            </div>
          </div>
          
          <!-- 进度条 -->
          <div class="level-progress">
            <div class="progress-header">
              <span>距离 {{ getNextLevelName(child.total_points) }}</span>
              <span class="progress-points">还差 {{ getPointsToNextLevel(child.total_points) }} 分</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: getLevelProgress(child.total_points) + '%' }">
                <div class="progress-shine"></div>
              </div>
            </div>
          </div>
        </div>
        
        <!-- 徽章预览 -->
        <div class="badges-preview">
          <div class="badges-header">
            <span>🏅 徽章</span>
            <button class="view-all-btn" @click="showAchievements(child)">查看全部 →</button>
          </div>
          <div class="badges-row">
            <template v-if="getChildBadges(child).length > 0">
              <div 
                v-for="(badge, index) in getChildBadges(child).slice(0, 3)" 
                :key="badge.id"
                class="badge-item"
                :class="{ unlocked: badge.unlocked }"
                :title="badge.name"
              >
                <span class="badge-emoji">{{ badge.emoji }}</span>
              </div>
              <div v-if="getChildBadges(child).length > 3" class="badge-more">
                +{{ getChildBadges(child).length - 3 }}
              </div>
            </template>
            <div v-else class="badges-empty">
              暂无徽章
            </div>
          </div>
        </div>
        
        <!-- 快捷操作 -->
        <div class="hero-actions">
          <button class="action-btn edit" @click="editChild(child)" title="编辑">
            ✏️
          </button>
          <button class="action-btn quick-add" @click="quickAddPoints(child)" title="快速加分"
          >
            ➕
          </button>
          <button class="action-btn delete" @click="deleteChild(child.id)" title="删除">
            🗑️
          </button>
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="children.length === 0" class="empty-state">
        <div class="empty-animation">
          <span class="empty-emoji">👶</span>
          <div class="empty-orbits">
            <span class="orbit-star">⭐</span>
            <span class="orbit-heart">💖</span>
            <span class="orbit-gift">🎁</span>
          </div>
        </div>
        <h3>还没有小英雄</h3>
        <p>召唤第一个孩子，开始你们的冒险之旅！</p>
        
        <button class="btn btn-primary empty-add-btn" @click="showAddModal = true">
          <span>✨ 召唤第一个英雄</span>
        </button>
      </div>
    </div>

    <!-- 成就墙弹窗 -->
    <div v-if="showAchievementsModal" class="modal-overlay" @click.self="closeAchievements">
      <div class="achievements-modal">
        <div class="modal-header">
          <div class="achievements-header">
            <span class="achievements-avatar">{{ selectedChild?.avatar || '👶' }}</span>
            <div>
              <h3>{{ selectedChild?.name }}的成就墙</h3>
              <p>LV.{{ getLevel(selectedChild?.total_points || 0) }} · {{ getTitle(selectedChild?.total_points || 0) }}</p>
            </div>
          </div>
          <button class="close-btn" @click="closeAchievements">×</button>
        </div>
        
        <div class="achievements-grid">
          <div 
            v-for="badge in allBadges" 
            :key="badge.id"
            class="achievement-card"
            :class="{ unlocked: isBadgeUnlocked(selectedChild, badge) }"
          >
            <div class="achievement-icon">
              <span>{{ badge.emoji }}</span>
              <div v-if="isBadgeUnlocked(selectedChild, badge)" class="unlocked-glow"></div>
            </div>
            <h4>{{ badge.name }}</h4>
            <p>{{ badge.description }}</p>
            
            <div class="achievement-requirement">
              <span v-if="isBadgeUnlocked(selectedChild, badge)">✅ 已获得</span>
              <span v-else>🔒 需要 {{ badge.requirement }} 分</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 添加/编辑孩子弹窗 -->
    <div v-if="showAddModal || showEditModal" class="modal-overlay" @click.self="closeModal">
      <div class="modal">
        <div class="modal-header">
          <h3>{{ isEditing ? '✏️ 编辑英雄' : '✨ 召唤新英雄' }}</h3>
          <button class="close-btn" @click="closeModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="form-group">
            <label>📝 英雄姓名</label>
            <input v-model="form.name" type="text" placeholder="请输入孩子姓名" />
          </div>
          
          <div class="form-group">
            <label>🎨 选择头像</label>
            
            <!-- 自定义头像上传 -->
            <div class="custom-avatar-upload">
              <div class="avatar-preview" v-if="form.avatar && !form.avatar.startsWith('👶')">
                <img :src="form.avatar" alt="头像" />
                <button class="remove-avatar" @click="form.avatar = '👶'" title="移除">✕</button>
              </div>
              <label class="upload-btn" v-else>
                <input type="file" accept="image/*" @change="handleAvatarUpload" hidden />
                <span>📷 上传照片</span>
              </label>
            </div>
            
            <div class="avatar-divider"><span>或选择表情</span></div>
            
            <div class="avatar-selector">
              <span 
                v-for="avatar in avatars" 
                :key="avatar"
                class="avatar-option"
                :class="{ active: form.avatar === avatar }"
                @click="form.avatar = avatar"
              >
                {{ avatar }}
              </span>
            </div>
          </div>
          
          <div class="form-group">
            <label>💎 初始金币</label>
            <input v-model.number="form.current_balance" type="number" min="0" />
          </div>
        </div>
        
        <div class="modal-footer">
          <button class="btn" @click="closeModal">取消</button>
          <button class="btn btn-primary" @click="saveChild" :disabled="!form.name">
            {{ isEditing ? '💾 保存' : '✨ 召唤' }}
          </button>
        </div>
      </div>
    </div>
    
    <!-- 快速加分弹窗 -->
    <div v-if="showQuickAddModal" class="modal-overlay" @click.self="closeQuickAddModal">
      <div class="modal quick-add-modal">
        <div class="modal-header">
          <h3>⚡ 快速加分 - {{ quickAddChild?.name }}</h3>
          <button class="close-btn" @click="closeQuickAddModal">×</button>
        </div>
        
        <div class="modal-body">
          <div class="quick-add-grid">
            <button 
              v-for="action in quickAddActions" 
              :key="action.id"
              class="quick-add-btn"
              :class="action.color"
              @click="confirmQuickAdd(action)"
            >
              <span class="quick-add-emoji">{{ action.emoji }}</span>
              <span class="quick-add-name">{{ action.name }}</span>
              <span class="quick-add-points">+{{ action.points }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
    
    <!-- 提示消息 -->
    <div v-if="message" :class="['toast-message', message.type]">
      <span class="toast-icon">{{ message.type === 'success' ? '✅' : '❌' }}</span>
      <span>{{ message.text }}</span>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../utils/supabase.js'

const children = ref([])
const showAddModal = ref(false)
const showEditModal = ref(false)
const showAchievementsModal = ref(false)
const showQuickAddModal = ref(false)
const isEditing = ref(false)
const editingId = ref(null)
const selectedChild = ref(null)
const quickAddChild = ref(null)
const bouncingChild = ref(null)
const message = ref(null)

const avatars = ['👶', '👧', '👦', '🧒', '👧🏻', '👦🏻', '🧒🏻', '👧🏽', '👦🏽', '🧝', '🧙', '🧛', '🧚', '🤴', '👸', '🦸', '🦹']

// 等级配置
const levels = [
  { level: 1, name: '新手勇士', min: 0, max: 49 },
  { level: 2, name: '见习骑士', min: 50, max: 149 },
  { level: 3, name: '青铜英雄', min: 150, max: 299 },
  { level: 4, name: '白银守护者', min: 300, max: 499 },
  { level: 5, name: '黄金战士', min: 500, max: 799 },
  { level: 6, name: '铂金勇者', min: 800, max: 1199 },
  { level: 7, name: '钻石守护者', min: 1200, max: 1699 },
  { level: 8, name: '星耀王者', min: 1700, max: 2299 },
  { level: 9, name: '传奇英雄', min: 2300, max: 2999 },
  { level: 10, name: '神话传说', min: 3000, max: Infinity }
]

// 徽章配置
const allBadges = [
  { id: 'first_step', name: '初出茅庐', emoji: '👣', description: '获得第一分金币', requirement: 1 },
  { id: 'collector', name: '金币收集者', emoji: '💰', description: '累计获得50分', requirement: 50 },
  { id: 'hundred', name: '百分达人', emoji: '💯', description: '累计获得100分', requirement: 100 },
  { id: 'streak_7', name: '周周坚持', emoji: '🔥', description: '连续7天有记录', requirement: 200 },
  { id: 'collector_500', name: '金币大师', emoji: '👑', description: '累计获得500分', requirement: 500 },
  { id: 'champion', name: '冠军之星', emoji: '🏆', description: '累计获得1000分', requirement: 1000 },
  { id: 'legend', name: '传说人物', emoji: '⭐', description: '累计获得2000分', requirement: 2000 },
  { id: 'master', name: '行为大师', emoji: '🎖️', description: '累计获得3000分', requirement: 3000 }
]

// 快捷加分动作
const quickAddActions = [
  { id: 'good_job', name: '做得好', emoji: '👍', points: 5, color: 'blue' },
  { id: 'excellent', name: '太棒了', emoji: '🌟', points: 10, color: 'gold' },
  { id: 'perfect', name: '完美', emoji: '💎', points: 20, color: 'purple' },
  { id: 'kindness', name: '乐于助人', emoji: '💝', points: 8, color: 'pink' },
  { id: 'study', name: '认真学习', emoji: '📚', points: 15, color: 'green' },
  { id: 'chore', name: '主动做家务', emoji: '🧹', points: 10, color: 'orange' }
]

const form = ref({
  name: '',
  avatar: '👶',
  current_balance: 0,
  total_points: 0
})

// 计算等级
function getLevel(totalPoints) {
  const level = levels.find(l => totalPoints >= l.min && totalPoints <= l.max)
  return level ? level.level : 1
}

// 获取等级名称
function getTitle(totalPoints) {
  const level = levels.find(l => totalPoints >= l.min && totalPoints <= l.max)
  return level ? level.name : '新手勇士'
}

// 获取下一级名称
function getNextLevelName(totalPoints) {
  const currentLevel = getLevel(totalPoints)
  const nextLevel = levels.find(l => l.level === currentLevel + 1)
  return nextLevel ? nextLevel.name : '最高等级'
}

// 获取距离下一级还差多少分
function getPointsToNextLevel(totalPoints) {
  const currentLevel = getLevel(totalPoints)
  const nextLevel = levels.find(l => l.level === currentLevel + 1)
  if (!nextLevel) return 0
  return nextLevel.min - totalPoints
}

// 获取等级进度百分比
function getLevelProgress(totalPoints) {
  const currentLevel = getLevel(totalPoints)
  const levelInfo = levels.find(l => l.level === currentLevel)
  const nextLevel = levels.find(l => l.level === currentLevel + 1)
  
  if (!nextLevel) return 100
  
  const range = nextLevel.min - levelInfo.min
  const progress = totalPoints - levelInfo.min
  return Math.min(100, Math.max(0, (progress / range) * 100))
}

// 获取品质等级
function getTier(totalPoints) {
  const level = getLevel(totalPoints)
  if (level >= 8) return 'legendary'
  if (level >= 5) return 'epic'
  if (level >= 3) return 'rare'
  return 'common'
}

// 获取孩子的徽章
function getChildBadges(child) {
  return allBadges.map(badge => ({
    ...badge,
    unlocked: child.total_points >= badge.requirement
  })).sort((a, b) => (b.unlocked ? 1 : 0) - (a.unlocked ? 1 : 0))
}

// 检查徽章是否解锁
function isBadgeUnlocked(child, badge) {
  if (!child) return false
  return child.total_points >= badge.requirement
}

// 显示成就墙
function showAchievements(child) {
  selectedChild.value = child
  showAchievementsModal.value = true
}

// 关闭成就墙
function closeAchievements() {
  showAchievementsModal.value = false
  selectedChild.value = null
}

// 加载孩子列表
async function loadChildren() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('total_points', { ascending: false })
  
  if (error) {
    console.error('加载孩子失败:', error)
    return
  }
  
  children.value = data || []
}

// 保存孩子
async function saveChild() {
  if (!form.value.name) return
  
  const user = await supabase.auth.getUser()
  const user_id = user.data.user?.id
  
  if (isEditing.value) {
    const { error } = await supabase
      .from('children')
      .update({
        name: form.value.name,
        avatar: form.value.avatar,
        current_balance: form.value.current_balance
      })
      .eq('id', editingId.value)
    
    if (error) {
      showMessage('error', '保存失败: ' + error.message)
      return
    }
    showMessage('success', '✅ 英雄信息已更新！')
  } else {
    const { error } = await supabase
      .from('children')
      .insert([{
        name: form.value.name,
        avatar: form.value.avatar,
        current_balance: form.value.current_balance,
        total_points: form.value.current_balance,
        user_id: user_id
      }])
    
    if (error) {
      showMessage('error', '添加失败: ' + error.message)
      return
    }
    showMessage('success', `✨ ${form.value.name} 已加入英雄殿堂！`)
  }
  
  closeModal()
  loadChildren()
}

// 编辑孩子
function editChild(child) {
  isEditing.value = true
  editingId.value = child.id
  form.value = {
    name: child.name,
    avatar: child.avatar || '👶',
    current_balance: child.current_balance
  }
  showEditModal.value = true
}

// 删除孩子
async function deleteChild(id) {
  if (!confirm('确定要删除这个英雄吗？所有相关记录也会被删除。')) return
  
  const { error } = await supabase
    .from('children')
    .delete()
    .eq('id', id)
  
  if (error) {
    showMessage('error', '删除失败: ' + error.message)
    return
  }
  
  showMessage('success', '英雄已离开殿堂')
  loadChildren()
}

// 快速加分
function quickAddPoints(child) {
  quickAddChild.value = child
  showQuickAddModal.value = true
}

// 关闭快速加分弹窗
function closeQuickAddModal() {
  showQuickAddModal.value = false
  quickAddChild.value = null
}

// 处理头像上传
function handleAvatarUpload(event) {
  const file = event.target.files[0]
  if (!file) return
  
  // 检查文件大小（限制 2MB）
  if (file.size > 2 * 1024 * 1024) {
    showMessage('error', '图片大小不能超过 2MB')
    return
  }
  
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.avatar = e.target.result
  }
  reader.readAsDataURL(file)
}

// 确认快速加分
async function confirmQuickAdd(action) {
  if (!quickAddChild.value) return
  
  const { error } = await supabase.from('transactions').insert({
    child_id: quickAddChild.value.id,
    points: action.points,
    type: 'earn',
    note: action.name,
    rule_id: null
  })
  
  if (error) {
    showMessage('error', '加分失败: ' + error.message)
    return
  }
  
  // 动画效果
  bouncingChild.value = quickAddChild.value.id
  setTimeout(() => bouncingChild.value = null, 500)
  
  showMessage('success', `✨ ${quickAddChild.value.name} ${action.name} +${action.points}分！`)
  closeQuickAddModal()
  loadChildren()
}

// 显示消息
function showMessage(type, text) {
  message.value = { type, text }
  setTimeout(() => message.value = null, 3000)
}

// 关闭弹窗
function closeModal() {
  showAddModal.value = false
  showEditModal.value = false
  isEditing.value = false
  editingId.value = null
  form.value = {
    name: '',
    avatar: '👶',
    current_balance: 0,
    total_points: 0
  }
}

onMounted(() => {
  loadChildren()
})
</script>

<style scoped>
.children-page {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
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
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.header-text h2 {
  font-size: 1.8rem;
  color: #333;
  margin: 0;
}

.header-text p {
  color: #868e96;
  margin: 4px 0 0;
  font-size: 0.95rem;
}

.add-hero-btn {
  padding: 14px 24px;
  font-size: 1rem;
  font-weight: 600;
  border-radius: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.plus-icon {
  font-size: 1.3rem;
  font-weight: 700;
}

/* 英雄卡网格 */
.heroes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 24px;
}

/* 英雄卡样式 */
.hero-card {
  background: white;
  border-radius: 24px;
  padding: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
  position: relative;
  transition: all 0.3s;
  overflow: hidden;
}

.hero-card:hover {
  transform: translateY(-8px);
  box-shadow: 0 12px 40px rgba(0,0,0,0.15);
}

/* 品质边框 */
.hero-card.common {
  border: 2px solid #dee2e6;
}

.hero-card.rare {
  border: 2px solid #4dabf7;
  box-shadow: 0 4px 20px rgba(77, 171, 247, 0.2);
}

.hero-card.epic {
  border: 2px solid #da77f2;
  box-shadow: 0 4px 20px rgba(218, 119, 242, 0.2);
}

.hero-card.legendary {
  border: 2px solid #ffd43b;
  box-shadow: 0 4px 20px rgba(255, 212, 59, 0.3);
  background: linear-gradient(135deg, #fff 0%, #fffbeb 100%);
}

/* 等级徽章 */
.level-badge {
  position: absolute;
  top: 16px;
  right: 16px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 8px 16px;
  border-radius: 20px;
  font-weight: 700;
  font-size: 0.9rem;
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
}

.hero-card.rare .level-badge {
  background: linear-gradient(135deg, #339af0 0%, #4dabf7 100%);
}

.hero-card.epic .level-badge {
  background: linear-gradient(135deg, #be4bdb 0%, #da77f2 100%);
}

.hero-card.legendary .level-badge {
  background: linear-gradient(135deg, #f59f00 0%, #ffd43b 100%);
  color: #333;
}

/* 英雄头像区域 */
.hero-avatar-section {
  text-align: center;
  margin-bottom: 20px;
}

.hero-avatar {
  width: 100px;
  height: 100px;
  margin: 0 auto 12px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.avatar-emoji {
  font-size: 3.5rem;
  z-index: 2;
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  z-index: 2;
}

.avatar-glow {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  opacity: 0.2;
  filter: blur(10px);
  z-index: 1;
}

.hero-card.rare .avatar-glow {
  background: linear-gradient(135deg, #339af0 0%, #4dabf7 100%);
  opacity: 0.3;
}

.hero-card.epic .avatar-glow {
  background: linear-gradient(135deg, #be4bdb 0%, #da77f2 100%);
  opacity: 0.3;
}

.hero-card.legendary .avatar-glow {
  background: linear-gradient(135deg, #f59f00 0%, #ffd43b 100%);
  opacity: 0.4;
  animation: glowPulse 2s infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(1); opacity: 0.4; }
  50% { transform: scale(1.1); opacity: 0.6; }
}

.hero-name {
  font-size: 1.4rem;
  color: #333;
  margin: 0 0 4px;
}

.hero-title {
  font-size: 0.9rem;
  color: #868e96;
  font-weight: 500;
}

/* 英雄统计 */
.hero-stats {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 16px;
  margin-bottom: 16px;
}

.stat-row {
  display: flex;
  justify-content: space-around;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.stat-label {
  font-size: 0.8rem;
  color: #868e96;
}

.stat-value {
  font-size: 1.6rem;
  font-weight: 700;
}

.stat-value.current {
  color: #11998e;
}

.stat-value.total {
  color: #667eea;
}

/* 分数弹跳动画 */
.score-bounce {
  animation: scoreBounce 0.5s ease-out;
}

@keyframes scoreBounce {
  0% { transform: scale(1); }
  25% { transform: scale(1.3); }
  50% { transform: scale(0.9); }
  75% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

/* 等级进度 */
.level-progress {
  margin-top: 12px;
}

.progress-header {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
  color: #495057;
  margin-bottom: 8px;
}

.progress-points {
  color: #667eea;
  font-weight: 600;
}

.progress-bar {
  height: 10px;
  background: #e9ecef;
  border-radius: 5px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #667eea 0%, #764ba2 100%);
  border-radius: 5px;
  transition: width 0.5s ease-out;
  position: relative;
}

.progress-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent);
  animation: shine 2s infinite;
}

@keyframes shine {
  0% { left: -100%; }
  100% { left: 100%; }
}

/* 徽章预览 */
.badges-preview {
  margin-bottom: 16px;
}

.badges-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
  font-size: 0.9rem;
  color: #495057;
}

.view-all-btn {
  background: none;
  border: none;
  color: #667eea;
  font-size: 0.85rem;
  cursor: pointer;
  font-weight: 600;
  transition: color 0.3s;
}

.view-all-btn:hover {
  color: #764ba2;
}

.badges-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.badge-item {
  width: 44px;
  height: 44px;
  background: #e9ecef;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  filter: grayscale(100%);
  opacity: 0.5;
  transition: all 0.3s;
}

.badge-item.unlocked {
  background: linear-gradient(135deg, #ffd43b 0%, #fcc419 100%);
  filter: grayscale(0%);
  opacity: 1;
  box-shadow: 0 4px 12px rgba(255, 212, 59, 0.3);
}

.badge-more {
  width: 44px;
  height: 44px;
  background: #f8f9fa;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: #667eea;
  font-size: 0.9rem;
}

.badges-empty {
  color: #adb5bd;
  font-size: 0.85rem;
}

/* 英雄操作 */
.hero-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  flex: 1;
  padding: 12px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-size: 1.2rem;
  transition: all 0.3s;
  background: #f8f9fa;
}

.action-btn:hover {
  transform: translateY(-2px);
}

.action-btn.edit:hover {
  background: #e7f3ff;
}

.action-btn.quick-add {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.action-btn.quick-add:hover {
  box-shadow: 0 4px 12px rgba(17, 153, 142, 0.4);
}

.action-btn.delete:hover {
  background: #ffe3e3;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  text-align: center;
  padding: 80px 40px;
  background: white;
  border-radius: 24px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.08);
}

.empty-animation {
  position: relative;
  width: 120px;
  height: 120px;
  margin: 0 auto 24px;
}

.empty-emoji {
  font-size: 4rem;
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.empty-orbits {
  position: absolute;
  inset: 0;
  animation: rotate 8s linear infinite;
}

.orbit-star {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  font-size: 1.2rem;
}

.orbit-heart {
  position: absolute;
  bottom: 10%;
  right: 10%;
  font-size: 1.2rem;
}

.orbit-gift {
  position: absolute;
  bottom: 10%;
  left: 10%;
  font-size: 1.2rem;
}

@keyframes rotate {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.empty-state h3 {
  font-size: 1.4rem;
  color: #333;
  margin-bottom: 8px;
}

.empty-state p {
  color: #868e96;
  margin-bottom: 24px;
}

.empty-add-btn {
  padding: 16px 32px;
  font-size: 1.1rem;
}

/* 成就墙弹窗 */
.achievements-modal {
  background: white;
  border-radius: 24px;
  padding: 30px;
  width: 90%;
  max-width: 700px;
  max-height: 90vh;
  overflow-y: auto;
}

.achievements-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.achievements-avatar {
  font-size: 2.5rem;
  width: 60px;
  height: 60px;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.achievements-header h3 {
  margin: 0;
  color: #333;
}

.achievements-header p {
  margin: 4px 0 0;
  color: #868e96;
}

.achievements-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
  margin-top: 24px;
}

.achievement-card {
  background: #f8f9fa;
  border-radius: 16px;
  padding: 20px;
  text-align: center;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.achievement-card.unlocked {
  background: linear-gradient(135deg, #fffbeb 0%, #fff 100%);
  border-color: #ffd43b;
}

.achievement-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
  position: relative;
  display: inline-block;
}

.unlocked-glow {
  position: absolute;
  inset: -10px;
  background: radial-gradient(circle, rgba(255,212,59,0.4) 0%, transparent 70%);
  border-radius: 50%;
  animation: glowPulse 2s infinite;
}

.achievement-card h4 {
  font-size: 0.95rem;
  color: #333;
  margin: 0 0 8px;
}

.achievement-card p {
  font-size: 0.8rem;
  color: #868e96;
  margin: 0 0 12px;
}

.achievement-requirement {
  font-size: 0.8rem;
  font-weight: 600;
}

.achievement-card.unlocked .achievement-requirement {
  color: #11998e;
}

.achievement-card:not(.unlocked) .achievement-requirement {
  color: #adb5bd;
}

/* 弹窗样式 */
.modal {
  background: white;
  border-radius: 24px;
  padding: 30px;
  width: 90%;
  max-width: 500px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.3rem;
  color: #333;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.8rem;
  cursor: pointer;
  color: #adb5bd;
  transition: color 0.3s;
}

.close-btn:hover {
  color: #495057;
}

/* 自定义头像上传 */
.custom-avatar-upload {
  margin-bottom: 16px;
}

.avatar-preview {
  position: relative;
  width: 100px;
  height: 100px;
  border-radius: 50%;
  overflow: hidden;
  border: 3px solid #667eea;
}

.avatar-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.remove-avatar {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #ff6b6b;
  color: white;
  border: none;
  cursor: pointer;
  font-size: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.upload-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border-radius: 12px;
  cursor: pointer;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s;
}

.upload-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.avatar-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 16px 0;
  color: #868e96;
  font-size: 0.85rem;
}

.avatar-divider::before,
.avatar-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background: #e9ecef;
}

/* 头像选择器 */
.avatar-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.avatar-option {
  width: 50px;
  height: 50px;
  border-radius: 12px;
  background: #f8f9fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.5rem;
  cursor: pointer;
  transition: all 0.3s;
  border: 2px solid transparent;
}

.avatar-option:hover {
  background: #e9ecef;
  transform: scale(1.1);
}

.avatar-option.active {
  border-color: #667eea;
  background: #e7f3ff;
}

/* 快速加分弹窗 */
.quick-add-modal {
  max-width: 450px;
}

.quick-add-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.quick-add-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 12px;
  border: none;
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.3s;
  gap: 8px;
  color: white;
}

.quick-add-btn:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.15);
}

.quick-add-btn.blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.quick-add-btn.gold { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.quick-add-btn.purple { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); }
.quick-add-btn.pink { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%); }
.quick-add-btn.green { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); }
.quick-add-btn.orange { background: linear-gradient(135deg, #fa709a 0%, #ff6b6b 100%); }

.quick-add-emoji {
  font-size: 2rem;
}

.quick-add-name {
  font-weight: 600;
  font-size: 0.95rem;
}

.quick-add-points {
  background: rgba(255,255,255,0.3);
  padding: 4px 14px;
  border-radius: 20px;
  font-weight: 700;
}

/* 提示消息 */
.toast-message {
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

.toast-message.success {
  background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%);
  color: white;
}

.toast-message.error {
  background: linear-gradient(135deg, #ff416c 0%, #ff4b2b 100%);
  color: white;
}

.toast-icon {
  font-size: 1.3rem;
}
</style>
