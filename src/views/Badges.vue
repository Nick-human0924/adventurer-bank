// src/views/Badges.vue
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
        <select v-model="selectedChildId" @change="loadBadges">
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
  return unlockedBadges.value.some(b => b.badge_id === badgeId)
}

function isNew(badgeId) {
  return unlockedBadges.value.some(b => b.badge_id === badgeId && b.is_new)
}

function getProgress(badge) {
  // 简化的进度计算，实际需要根据条件计算
  const condition = badge.unlock_condition
  if (!condition) return 0
  
  // 这里需要根据实际条件计算进度
  // 例如：如果是total_points，需要查询当前积分
  return 0
}

function showBadgeDetail(badge) {
  if (isUnlocked(badge.id) && isNew(badge.id)) {
    animatedBadge.value = badge
    showAnimation.value = true
    // 标记为已查看
    markAsSeen(badge.id)
  }
}

async function markAsSeen(badgeId) {
  await supabase
    .from('child_badges')
    .update({ is_new: false })
    .eq('child_id', selectedChildId.value)
    .eq('badge_id', badgeId)
}

async function loadChildren() {
  const { data } = await supabase.from('children').select('*').eq('is_active', true)
  children.value = data || []
  if (data?.length > 0 && !selectedChildId.value) {
    selectedChildId.value = data[0].id
  }
}

async function loadBadges() {
  if (!selectedChildId.value) return
  
  // 加载所有徽章定义
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .eq('is_active', true)
    .order('category')
    .order('tier', { ascending: false })
  
  allBadges.value = badges || []
  
  // 加载已解锁徽章
  const { data: unlocked } = await supabase
    .from('child_badges')
    .select('*')
    .eq('child_id', selectedChildId.value)
  
  unlockedBadges.value = unlocked || []
}

async function checkNewBadges() {
  // 调用API检查是否有新徽章解锁
  const { data } = await supabase.functions.invoke('check-badges', {
    body: { childId: selectedChildId.value }
  })
  
  if (data?.newBadges?.length > 0) {
    // 有新徽章，重新加载
    await loadBadges()
    // 显示第一个新徽章动画
    const newBadge = allBadges.value.find(b => b.id === data.newBadges[0])
    if (newBadge) {
      animatedBadge.value = newBadge
      showAnimation.value = true
    }
  }
}

onMounted(async () => {
  await loadChildren()
  await loadBadges()
  await checkNewBadges()
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
  flex-wrap: wrap;
  gap: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-icon {
  font-size: 48px;
}

.header-text h2 {
  margin: 0;
  font-size: 24px;
}

.header-text p {
  margin: 4px 0 0;
  color: #666;
}

.child-selector select {
  padding: 10px 16px;
  border-radius: 8px;
  border: 1px solid #ddd;
  font-size: 15px;
}

.filter-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
  flex-wrap: wrap;
}

.filter-tab {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 20px;
  border: 1px solid #e0e0e0;
  border-radius: 24px;
  background: white;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
}

.filter-tab:hover {
  border-color: #4CAF50;
}

.filter-tab.active {
  background: #4CAF50;
  color: white;
  border-color: #4CAF50;
}

.tab-count {
  background: rgba(255,255,255,0.3);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
}

.section {
  margin-bottom: 32px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
}

.section-count {
  color: #666;
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

@media (max-width: 640px) {
  .badges-page {
    padding: 16px;
  }
  
  .badges-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}
</style>
