<template>
  <div class="badges-page">
    <div class="page-header">
      <div class="header-left">
        <span class="header-icon">🏆</span>
        <div class="header-text">
          <h2>{{ currentChild?.name }}的徽章墙</h2>
          <p>已解锁 {{ unlockedCount }}/{{ totalCount }} 个徽章</p>
        </div>
      </div>
      
      <div class="child-selector" v-if="children.length > 1">
        <select v-model="selectedChildId" @change="onChildChange">
          <option v-for="child in children" :key="child.id" :value="child.id">
            {{ child.name }}
          </option>
        </select>
      </div>
    </div>
    
    <!-- 最近解锁 -->
    <div v-if="recentBadges.length > 0" class="section">
      <div class="section-title">🎉 最近获得</div>
      <div class="badges-grid small">
        <BadgeCard 
          v-for="badge in recentBadges" 
          :key="badge.id"
          :badge="badge"
          :is-unlocked="true"
          :is-new="badge.is_new"
          @click="showBadgeDetail(badge)"
        />
      </div>
    </div>
    
    <!-- 分类筛选 -->
    <div class="filter-tabs">
      <button 
        v-for="tab in filterTabs" 
        :key="tab.value"
        :class="['filter-tab', { active: currentFilter === tab.value }]"
        @click="currentFilter = tab.value"
      >
        <span>{{ tab.label }}</span>
        <span v-if="tab.count > 0" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>
    
    <!-- 徽章列表 -->
    <div class="section">
      <div class="section-header">
        <span class="section-title">{{ currentSectionTitle }}</span>
        <span class="section-count">{{ filteredBadges.length }}个</span>
      </div>
      
      <div class="badges-grid">
        <BadgeCard 
          v-for="badge in filteredBadges" 
          :key="badge.id"
          :badge="badge"
          :is-unlocked="isUnlocked(badge.id)"
          :is-new="isNew(badge.id)"
          :progress="getProgress(badge)"
          @click="showBadgeDetail(badge)"
        />
      </div>
    </div>
    
    <!-- 解锁动画 -->
    <BadgeUnlockAnimation 
      v-if="showAnimation"
      :badge="animatedBadge"
      @close="showAnimation = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { supabase } from '../utils/supabase.js'
import BadgeCard from '../components/badges/BadgeCard.vue'
import BadgeUnlockAnimation from '../components/badges/BadgeUnlockAnimation.vue'

const children = ref([])
const selectedChildId = ref('')
const allBadges = ref([])
const unlockedBadges = ref([])
const currentFilter = ref('all')
const showAnimation = ref(false)
const animatedBadge = ref(null)
const childStats = ref({}) // 孩子的统计信息

const filterTabs = [
  { value: 'all', label: '全部' },
  { value: 'milestone', label: '里程碑' },
  { value: 'streak', label: '连续' },
  { value: 'category', label: '分类' },
  { value: 'special', label: '特殊' }
]

const currentChild = computed(() => {
  return children.value.find(c => c.id === selectedChildId.value)
})

const totalCount = computed(() => allBadges.value.length)

const unlockedCount = computed(() => unlockedBadges.value.length)

const recentBadges = computed(() => {
  return unlockedBadges.value
    .filter(b => b.is_new)
    .slice(0, 4)
})

const currentSectionTitle = computed(() => {
  const titles = {
    all: '所有徽章',
    milestone: '里程碑徽章',
    streak: '连续挑战徽章',
    category: '分类成就徽章',
    special: '特殊成就徽章'
  }
  return titles[currentFilter.value]
})

const filteredBadges = computed(() => {
  if (currentFilter.value === 'all') {
    return allBadges.value
  }
  return allBadges.value.filter(b => b.category === currentFilter.value)
})

function isUnlocked(badgeId) {
  // 确保类型一致（字符串比较）
  const strBadgeId = String(badgeId)
  const result = unlockedBadges.value.some(b => String(b.badge_id) === strBadgeId)
  return result
}

function isNew(badgeId) {
  const strBadgeId = String(badgeId)
  return unlockedBadges.value.some(b => String(b.badge_id) === strBadgeId && b.is_new)
}

function getProgress(badge) {
  const condition = badge.unlock_condition
  if (!condition) return 0
  
  const stats = childStats.value
  
  switch (condition.type) {
    case 'total_points':
      return stats.totalPoints || 0
    case 'streak_days':
      return stats.streakDays || 0
    case 'days_active':
      return stats.daysActive || 0
    case 'category_points':
      return stats.categoryPoints?.[condition.category] || 0
    case 'redeem_count':
      return stats.redeemCount || 0
    default:
      return 0
  }
}

function showBadgeDetail(badge) {
  if (isUnlocked(badge.id) && isNew(badge.id)) {
    animatedBadge.value = badge
    showAnimation.value = true
    markAsSeen(badge.id)
  }
}

async function markAsSeen(badgeId) {
  try {
    await supabase
      .from('child_badges')
      .update({ is_new: false })
      .eq('child_id', selectedChildId.value)
      .eq('badge_id', badgeId)
    
    // 更新本地状态
    const badge = unlockedBadges.value.find(b => b.badge_id === badgeId)
    if (badge) {
      badge.is_new = false
    }
  } catch (err) {
    console.warn('标记已查看失败:', err)
  }
}

async function loadChildren() {
  const { data } = await supabase.from('children').select('*').eq('is_active', true)
  children.value = data || []
  if (data?.length > 0 && !selectedChildId.value) {
    selectedChildId.value = data[0].id
  }
}

async function calculateChildStats(childId) {
  // 查询孩子的所有交易记录
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: true })
  
  const stats = {
    totalPoints: 0,
    streakDays: 0,
    daysActive: 0,
    redeemCount: 0,
    categoryPoints: {}
  }
  
  if (!txs || txs.length === 0) {
    return stats
  }
  
  // 计算总积分
  stats.totalPoints = txs
    .filter(t => t.type === 'earn')
    .reduce((sum, t) => sum + t.points, 0)
  
  // 计算活跃天数（有交易记录的天数）
  const activeDates = new Set()
  for (const tx of txs) {
    const d = new Date(tx.created_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    activeDates.add(dateStr)
  }
  stats.daysActive = activeDates.size
  
  // 计算连续天数
  const sortedDates = Array.from(activeDates).sort()
  let currentStreak = 0
  let maxStreak = 0
  let prevDate = null
  
  for (const dateStr of sortedDates) {
    if (prevDate) {
      const prev = new Date(prevDate)
      const curr = new Date(dateStr)
      const diffDays = (curr - prev) / (1000 * 60 * 60 * 24)
      
      if (diffDays === 1) {
        currentStreak++
      } else {
        maxStreak = Math.max(maxStreak, currentStreak)
        currentStreak = 1
      }
    } else {
      currentStreak = 1
    }
    prevDate = dateStr
  }
  stats.streakDays = Math.max(maxStreak, currentStreak)
  
  // 计算兑换次数
  stats.redeemCount = txs.filter(t => t.type === 'redeem').length
  
  return stats
}

async function loadBadges() {
  if (!selectedChildId.value) return
  
  try {
    // 计算孩子统计信息
    childStats.value = await calculateChildStats(selectedChildId.value)
    console.log('📊 孩子统计:', childStats.value)
    
    // 加载所有徽章定义
    const { data: badges, error: badgesError } = await supabase
      .from('badges')
      .select('*')
      .eq('is_active', true)
      .order('category')
      .order('tier', { ascending: false })
    
    if (badgesError) {
      console.warn('徽章表不存在，使用空列表:', badgesError.message)
      allBadges.value = []
    } else {
      allBadges.value = badges || []
    }
    
    // 加载已解锁徽章
    const { data: unlocked, error: unlockedError } = await supabase
      .from('child_badges')
      .select('*')
      .eq('child_id', selectedChildId.value)
    
    if (unlockedError) {
      console.warn('child_badges表不存在:', unlockedError.message)
      unlockedBadges.value = []
    } else {
      unlockedBadges.value = unlocked || []
      console.log('🏆 已解锁徽章:', unlockedBadges.value.length, '个')
    }
    
    // 检查并解锁新徽章（客户端计算）
    await checkAndUnlockBadges()
    
  } catch (err) {
    console.warn('加载徽章出错:', err)
    allBadges.value = []
    unlockedBadges.value = []
  }
}

// 已解锁徽章缓存（防止重复显示动画）
const unlockedBadgeIds = ref(new Set())

async function checkAndUnlockBadges() {
  const stats = childStats.value
  const newUnlocks = []
  
  console.log('🔍 checkAndUnlockBadges 开始:', { 
    totalPoints: stats.totalPoints, 
    streakDays: stats.streakDays,
    daysActive: stats.daysActive,
    allBadgesCount: allBadges.value.length,
    alreadyUnlockedInSession: Array.from(unlockedBadgeIds.value)
  })
  
  // 如果没有徽章定义，直接返回
  if (!allBadges.value || allBadges.value.length === 0) {
    console.log('⚠️ 没有徽章定义，跳过检查')
    return
  }
  
  for (const badge of allBadges.value) {
    // 跳过已解锁的（从数据库状态和本地缓存双重检查）
    const badgeIdStr = String(badge.id)
    const alreadyUnlocked = unlockedBadges.value.some(b => String(b.badge_id) === badgeIdStr)
    
    if (alreadyUnlocked || unlockedBadgeIds.value.has(badgeIdStr)) {
      console.log(`⏭️ ${badge.name} 已解锁，跳过`)
      continue
    }
    
    const condition = badge.unlock_condition
    if (!condition) {
      console.log(`⚠️ ${badge.name} 没有解锁条件`)
      continue
    }
    
    let shouldUnlock = false
    let currentValue = 0
    
    switch (condition.type) {
      case 'total_points':
        currentValue = stats.totalPoints || 0
        shouldUnlock = currentValue >= condition.min
        break
      case 'streak_days':
        currentValue = stats.streakDays || 0
        shouldUnlock = currentValue >= condition.min
        break
      case 'days_active':
        currentValue = stats.daysActive || 0
        shouldUnlock = currentValue >= condition.min
        break
      case 'redeem_count':
        currentValue = stats.redeemCount || 0
        shouldUnlock = currentValue >= condition.min
        break
      case 'category_points':
        currentValue = stats.categoryPoints?.[condition.category] || 0
        shouldUnlock = currentValue >= condition.min
        break
      default:
        console.log(`⚠️ ${badge.name} 未知条件类型: ${condition.type}`)
    }
    
    console.log(`🎫 ${badge.name} | 条件:${condition.type} | 目标:${condition.min} | 当前:${currentValue} | 解锁:${shouldUnlock}`)
    
    // 只有条件严格满足时才解锁
    if (shouldUnlock === true && currentValue > 0) {
      newUnlocks.push(badge)
    }
  }
  
  // 批量解锁新徽章
  if (newUnlocks.length > 0) {
    console.log('🎉 新解锁徽章:', newUnlocks.map(b => b.name))
    
    for (const badge of newUnlocks) {
      try {
        const { error } = await supabase.from('child_badges').insert({
          child_id: selectedChildId.value,
          badge_id: badge.id,
          is_new: true
        })
        
        if (error) {
          console.warn(`解锁徽章 ${badge.name} 失败:`, error)
          continue
        }
        
        // 添加到本地缓存，防止重复显示
        unlockedBadgeIds.value.add(String(badge.id))
        
        // 同时添加到本地数组，立即生效
        unlockedBadges.value.push({
          child_id: selectedChildId.value,
          badge_id: badge.id,
          is_new: true,
          unlocked_at: new Date().toISOString()
        })
        
      } catch (err) {
        console.warn(`解锁徽章 ${badge.name} 失败:`, err)
      }
    }
    
    // 显示第一个新徽章动画（只显示真正新解锁的）
    if (newUnlocks.length > 0 && !showAnimation.value) {
      animatedBadge.value = newUnlocks[0]
      showAnimation.value = true
    }
  } else {
    console.log('✅ 没有新徽章需要解锁')
  }
}

async function onChildChange() {
  await loadBadges()
}

onMounted(async () => {
  await loadChildren()
  await loadBadges()
})
</script>

<style scoped>
.badges-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
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
  gap: 12px;
}

.header-icon {
  font-size: 36px;
}

.header-text h2 {
  margin: 0;
  font-size: 24px;
  color: #333;
}

.header-text p {
  margin: 4px 0 0;
  color: #666;
}

.child-selector select {
  padding: 8px 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 14px;
  background: white;
}

.section {
  margin-bottom: 24px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.filter-tab {
  padding: 8px 16px;
  border-radius: 20px;
  border: 1px solid #ddd;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-tab:hover {
  background: #f5f5f5;
}

.filter-tab.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.tab-count {
  background: #ff5722;
  color: white;
  font-size: 11px;
  padding: 2px 6px;
  border-radius: 10px;
  margin-left: 4px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-count {
  color: #999;
  font-size: 14px;
}

.badges-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 16px;
}

.badges-grid.small {
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
}

@media (max-width: 768px) {
  .badges-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
