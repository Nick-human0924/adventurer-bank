<template>
  <div class="adventure-page">
    <section class="hero-panel">
      <div class="hero-copy">
        <span class="eyebrow">第二阶段 · 冒险主线</span>
        <h2>冒险地图</h2>
        <p>把每天的好习惯变成一段可见的旅程：连续记录越稳定，地图就推进得越远，奖励也越清楚。</p>
      </div>

      <div class="child-picker" v-if="children.length > 0">
        <label>选择小英雄</label>
        <select v-model="selectedChildId">
          <option v-for="child in children" :key="child.id" :value="child.id">
            {{ child.avatar?.startsWith('data:') ? '' : (child.avatar || '👶') }} {{ child.name }}
          </option>
        </select>
      </div>
    </section>

    <section v-if="loading" class="state-card">
      <div class="spinner">🧭</div>
      <p>正在绘制冒险地图...</p>
    </section>

    <section v-else-if="children.length === 0" class="state-card">
      <div class="empty-icon">🏕️</div>
      <h3>还没有小英雄</h3>
      <p>先去“孩子管理”添加孩子，就能开始冒险主线。</p>
    </section>

    <template v-else>
      <section class="summary-grid">
        <div class="summary-card primary">
          <span class="summary-label">当前连胜</span>
          <strong>{{ currentStreak }}</strong>
          <span class="summary-unit">天</span>
          <p>{{ streakMessage }}</p>
        </div>

        <div class="summary-card">
          <span class="summary-label">30天活跃</span>
          <strong>{{ activeDaysInWindow }}</strong>
          <span class="summary-unit">天</span>
          <p>有记录的日子越多，地图越亮。</p>
        </div>

        <div class="summary-card">
          <span class="summary-label">今日收获</span>
          <strong>{{ todayCoins }}</strong>
          <span class="summary-unit">金币</span>
          <p>{{ todayCompletedCount }} 条行为记录。</p>
        </div>

        <div class="summary-card treasure">
          <span class="summary-label">最近奖励</span>
          <strong>{{ nearestPrize ? nearestPrize.price : '—' }}</strong>
          <span class="summary-unit">{{ nearestPrizeCurrency }}</span>
          <p>{{ nearestPrizeText }}</p>
        </div>
      </section>

      <section class="map-card">
        <div class="section-heading">
          <div>
            <span class="eyebrow">Adventure Path</span>
            <h3>{{ selectedChild?.name }} 的成长路线</h3>
          </div>
          <button class="refresh-btn" @click="refreshData" :disabled="loading">刷新地图</button>
        </div>

        <div class="map-track">
          <article
            v-for="(stage, index) in stages"
            :key="stage.name"
            class="stage-node"
            :class="{ unlocked: stage.unlocked, current: stage.current }"
          >
            <div class="node-topline">
              <span class="node-index">{{ index + 1 }}</span>
              <span class="node-icon">{{ stage.icon }}</span>
            </div>
            <h4>{{ stage.name }}</h4>
            <p>{{ stage.description }}</p>
            <div class="node-requirement">
              {{ stage.required === 0 ? '起点' : `需要连续 ${stage.required} 天` }}
            </div>
          </article>
        </div>
      </section>

      <section class="quest-grid">
        <article class="quest-card daily">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow">Today</span>
              <h3>今日冒险清单</h3>
            </div>
          </div>

          <div v-if="todayTransactions.length > 0" class="today-list">
            <div v-for="tx in todayTransactions.slice(0, 5)" :key="tx.id" class="today-item">
              <span class="today-icon">{{ tx.type === 'earn' ? '⭐' : '↩' }}</span>
              <div>
                <strong>{{ tx.note || tx.rule_name || '行为记录' }}</strong>
                <p>{{ formatTime(tx.created_at) }}</p>
              </div>
              <span class="today-points" :class="tx.type">{{ tx.type === 'earn' ? '+' : '-' }}{{ tx.points }}</span>
            </div>
          </div>

          <div v-else class="quiet-box">
            <strong>今天还没点亮地图</strong>
            <p>记录任意一个好行为，就能保持今天的冒险火种。</p>
          </div>
        </article>

        <article class="quest-card">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow">Streak Quest</span>
              <h3>连续挑战</h3>
            </div>
          </div>

          <div class="streak-ring">
            <div class="ring" :style="{ '--progress': `${nextStageProgress}%` }">
              <span>{{ nextStageProgress }}%</span>
            </div>
            <div>
              <strong>{{ nextStageTitle }}</strong>
              <p>{{ nextStageHint }}</p>
            </div>
          </div>

          <div class="week-dots">
            <span
              v-for="day in recentWeek"
              :key="day.date"
              class="week-dot"
              :class="{ active: day.active, today: day.isToday }"
              :title="day.label"
            >
              {{ day.shortLabel }}
            </span>
          </div>
        </article>

        <article class="quest-card reward">
          <div class="section-heading compact">
            <div>
              <span class="eyebrow">Treasure</span>
              <h3>奖励目标</h3>
            </div>
          </div>

          <div v-if="nearestPrize" class="prize-focus">
            <div class="prize-image">
              <img v-if="nearestPrize.image" :src="nearestPrize.image" :alt="nearestPrize.name" />
              <span v-else>🎁</span>
            </div>
            <div>
              <strong>{{ nearestPrize.name }}</strong>
              <p>{{ nearestPrize.description || '把奖励放在地图终点，孩子会更容易理解为什么要坚持。' }}</p>
              <div class="prize-progress">
                <div class="prize-fill" :style="{ width: `${nearestPrizeProgress}%` }"></div>
              </div>
              <small>{{ nearestPrizeProgressText }}</small>
            </div>
          </div>

          <div v-else class="quiet-box">
            <strong>商城还没有奖励</strong>
            <p>添加一个短期可兑换奖励，地图推进会更有动力。</p>
          </div>
        </article>
      </section>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { supabase, getCachedUser } from '../utils/supabase.js'

const children = ref([])
const transactions = ref([])
const tasks = ref([])
const prizes = ref([])
const selectedChildId = ref('')
const loading = ref(false)

const mapStages = [
  { name: '新手营地', icon: '🏕️', required: 0, description: '开始记录好习惯，点亮第一块地图。' },
  { name: '星星森林', icon: '🌲', required: 3, description: '连续三天有记录，孩子会看到坚持的力量。' },
  { name: '勇气山丘', icon: '⛰️', required: 7, description: '一周连胜，适合给一次小小仪式感。' },
  { name: '宝石洞穴', icon: '💎', required: 14, description: '两周稳定坚持，可以解锁稀有奖励。' },
  { name: '冠军城堡', icon: '🏰', required: 30, description: '一个月冒险完成，适合做家庭颁奖。' }
]

const selectedChild = computed(() => children.value.find(child => child.id === selectedChildId.value))

const childTransactions = computed(() => {
  return transactions.value
    .filter(tx => tx.child_id === selectedChildId.value)
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
})

const todayKey = computed(() => toDateKey(new Date()))

const todayTransactions = computed(() => {
  return childTransactions.value.filter(tx => toDateKey(tx.created_at) === todayKey.value)
})

const todayCoins = computed(() => {
  return todayTransactions.value.reduce((total, tx) => {
    return total + (tx.type === 'earn' ? Number(tx.points || 0) : -Number(tx.points || 0))
  }, 0)
})

const todayCompletedCount = computed(() => todayTransactions.value.length)

const activeDateSet = computed(() => {
  return new Set(childTransactions.value.filter(tx => tx.type === 'earn').map(tx => toDateKey(tx.created_at)))
})

const activeDaysInWindow = computed(() => {
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 29)
  const cutoffKey = toDateKey(cutoff)
  return [...activeDateSet.value].filter(date => date >= cutoffKey).length
})

const currentStreak = computed(() => {
  let streak = 0
  const cursor = new Date()

  while (activeDateSet.value.has(toDateKey(cursor))) {
    streak += 1
    cursor.setDate(cursor.getDate() - 1)
  }

  return streak
})

const currentBalance = computed(() => {
  const child = selectedChild.value
  if (!child) return 0

  const earned = childTransactions.value
    .filter(tx => tx.type === 'earn')
    .reduce((sum, tx) => sum + Number(tx.points || 0), 0)
  const spent = childTransactions.value
    .filter(tx => tx.type === 'spend')
    .reduce((sum, tx) => sum + Number(tx.points || 0), 0)

  return earned || spent ? earned - spent : Number(child.current_balance || 0)
})

const stages = computed(() => {
  const streak = currentStreak.value
  const unlockedStages = mapStages.filter(stage => streak >= stage.required)
  const currentStageName = unlockedStages[unlockedStages.length - 1]?.name || mapStages[0].name

  return mapStages.map(stage => ({
    ...stage,
    unlocked: streak >= stage.required,
    current: stage.name === currentStageName
  }))
})

const nextLockedStage = computed(() => mapStages.find(stage => currentStreak.value < stage.required))

const nextStageProgress = computed(() => {
  const next = nextLockedStage.value
  if (!next) return 100
  return Math.min(100, Math.round((currentStreak.value / next.required) * 100))
})

const nextStageTitle = computed(() => {
  const next = nextLockedStage.value
  return next ? `下一站：${next.name}` : '冠军城堡已点亮'
})

const nextStageHint = computed(() => {
  const next = nextLockedStage.value
  if (!next) return '可以设置新的30天主题挑战，保持新鲜感。'
  return `还差 ${next.required - currentStreak.value} 天连续记录，就能点亮${next.name}。`
})

const streakMessage = computed(() => {
  if (currentStreak.value === 0) return '今天记录一次，就能重新点燃冒险火把。'
  if (currentStreak.value < 3) return '火把已经点亮，先冲三天小目标。'
  if (currentStreak.value < 7) return '孩子已经进入节奏，可以准备一次小奖励。'
  return '连胜很稳了，适合做一次家庭表扬仪式。'
})

const nearestPrize = computed(() => {
  if (prizes.value.length === 0) return null

  const coinPrizes = prizes.value
    .filter(prize => (prize.price_type || 'coins') === 'coins' && Number(prize.stock ?? 1) > 0)
    .sort((a, b) => Number(a.price || 0) - Number(b.price || 0))

  return coinPrizes.find(prize => Number(prize.price || 0) >= currentBalance.value) || coinPrizes[coinPrizes.length - 1] || null
})

const nearestPrizeCurrency = computed(() => nearestPrize.value ? '金币' : '')

const nearestPrizeProgress = computed(() => {
  if (!nearestPrize.value) return 0
  return Math.min(100, Math.round((currentBalance.value / Number(nearestPrize.value.price || 1)) * 100))
})

const nearestPrizeText = computed(() => {
  if (!nearestPrize.value) return '先在商城添加一个孩子想要的奖励。'
  const gap = Number(nearestPrize.value.price || 0) - currentBalance.value
  if (gap <= 0) return `${nearestPrize.value.name} 已经可以兑换。`
  return `离 ${nearestPrize.value.name} 还差 ${gap} 金币。`
})

const nearestPrizeProgressText = computed(() => {
  if (!nearestPrize.value) return ''
  return `${currentBalance.value} / ${nearestPrize.value.price} 金币`
})

const recentWeek = computed(() => {
  const days = []
  const formatter = new Intl.DateTimeFormat('zh-CN', { weekday: 'short' })

  for (let i = 6; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const key = toDateKey(date)
    days.push({
      date: key,
      active: activeDateSet.value.has(key),
      isToday: key === todayKey.value,
      label: date.toLocaleDateString('zh-CN'),
      shortLabel: formatter.format(date).replace('周', '')
    })
  }

  return days
})

watch(selectedChildId, async (childId) => {
  if (childId) await loadChildRelatedData()
})

onMounted(refreshData)

async function refreshData() {
  loading.value = true
  try {
    await loadChildren()
    if (selectedChildId.value) {
      await loadChildRelatedData()
    }
  } finally {
    loading.value = false
  }
}

async function loadChildren() {
  const user = await getCachedUser()
  if (!user) return

  const { data, error } = await supabase
    .from('children')
    .select('*')
    .eq('user_id', user.id)
    .order('name')

  if (error) throw error

  children.value = data || []
  if (!selectedChildId.value && children.value.length > 0) {
    selectedChildId.value = children.value[0].id
  }
}

async function loadChildRelatedData() {
  const user = await getCachedUser()
  if (!user || !selectedChildId.value) return

  const since = new Date()
  since.setDate(since.getDate() - 120)

  const [txResult, taskResult, prizeResult] = await Promise.all([
    supabase
      .from('transactions')
      .select('*')
      .eq('child_id', selectedChildId.value)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000),
    supabase
      .from('tasks')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('prizes')
      .select('*')
      .eq('user_id', user.id)
      .order('price', { ascending: true })
      .limit(50)
  ])

  if (txResult.error) throw txResult.error
  if (taskResult.error) console.warn('加载任务失败:', taskResult.error)
  if (prizeResult.error) console.warn('加载奖励失败:', prizeResult.error)

  transactions.value = txResult.data || []
  tasks.value = taskResult.data || []
  prizes.value = prizeResult.data || []
}

function toDateKey(value) {
  const date = value instanceof Date ? value : new Date(value)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatTime(value) {
  return new Date(value).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })
}
</script>

<style scoped>
.adventure-page {
  padding: 24px;
  color: #243047;
}

.hero-panel {
  display: flex;
  justify-content: space-between;
  gap: 24px;
  align-items: flex-end;
  padding: 28px;
  border-radius: 28px;
  color: white;
  background:
    radial-gradient(circle at 12% 18%, rgba(255, 255, 255, 0.28), transparent 28%),
    radial-gradient(circle at 82% 16%, rgba(255, 214, 102, 0.35), transparent 24%),
    linear-gradient(135deg, #163b4f 0%, #256d7b 48%, #f29f4b 100%);
  box-shadow: 0 20px 50px rgba(22, 59, 79, 0.25);
  margin-bottom: 24px;
}

.hero-copy h2 {
  font-size: clamp(2rem, 5vw, 4rem);
  margin: 6px 0;
  letter-spacing: -0.05em;
}

.hero-copy p {
  max-width: 620px;
  margin: 0;
  color: rgba(255, 255, 255, 0.86);
  line-height: 1.7;
}

.eyebrow {
  display: inline-flex;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  font-size: 0.75rem;
  font-weight: 800;
  color: #ffd66b;
}

.child-picker {
  min-width: 240px;
  padding: 16px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(16px);
}

.child-picker label {
  display: block;
  margin-bottom: 8px;
  font-weight: 700;
}

.child-picker select {
  width: 100%;
  border: none;
  border-radius: 14px;
  padding: 12px 14px;
  font-weight: 700;
}

.summary-grid,
.quest-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.quest-grid {
  grid-template-columns: 1.15fr 1fr 1fr;
}

.summary-card,
.map-card,
.quest-card,
.state-card {
  background: #fffdf7;
  border: 1px solid rgba(36, 48, 71, 0.08);
  border-radius: 24px;
  box-shadow: 0 14px 40px rgba(36, 48, 71, 0.08);
}

.summary-card {
  padding: 20px;
  overflow: hidden;
  position: relative;
}

.summary-card.primary {
  background: linear-gradient(135deg, #fff2c7, #ffffff);
}

.summary-card.treasure {
  background: linear-gradient(135deg, #eef6ff, #ffffff);
}

.summary-label,
.summary-unit {
  display: block;
  color: #69758a;
  font-weight: 700;
}

.summary-card strong {
  display: inline-block;
  font-size: 2.6rem;
  line-height: 1;
  margin: 10px 8px 8px 0;
  color: #163b4f;
}

.summary-card p {
  margin: 0;
  color: #69758a;
  line-height: 1.5;
}

.map-card,
.quest-card,
.state-card {
  padding: 24px;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 20px;
}

.section-heading.compact {
  margin-bottom: 16px;
}

.section-heading h3 {
  margin: 4px 0 0;
  font-size: 1.35rem;
  color: #243047;
}

.refresh-btn {
  border: none;
  border-radius: 999px;
  padding: 11px 18px;
  color: white;
  font-weight: 800;
  cursor: pointer;
  background: linear-gradient(135deg, #256d7b, #163b4f);
}

.map-track {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 14px;
}

.stage-node {
  min-height: 190px;
  padding: 18px;
  border-radius: 22px;
  background: #f4f0e8;
  border: 2px solid transparent;
  opacity: 0.62;
  transition: transform 0.25s ease, opacity 0.25s ease, box-shadow 0.25s ease;
}

.stage-node.unlocked {
  opacity: 1;
  background: linear-gradient(145deg, #ffffff, #fff6d7);
}

.stage-node.current {
  border-color: #f29f4b;
  box-shadow: 0 12px 30px rgba(242, 159, 75, 0.2);
  transform: translateY(-4px);
}

.node-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.node-index {
  width: 32px;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #243047;
  color: white;
  font-weight: 900;
}

.node-icon {
  font-size: 2.2rem;
}

.stage-node h4 {
  margin: 16px 0 8px;
  font-size: 1.1rem;
}

.stage-node p,
.quest-card p {
  margin: 0;
  color: #69758a;
  line-height: 1.55;
}

.node-requirement {
  margin-top: 16px;
  display: inline-flex;
  border-radius: 999px;
  padding: 6px 10px;
  background: rgba(37, 109, 123, 0.1);
  color: #256d7b;
  font-weight: 800;
  font-size: 0.82rem;
}

.today-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.today-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border-radius: 16px;
  background: #f7f2e9;
}

.today-icon {
  width: 42px;
  height: 42px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 14px;
  background: white;
}

.today-item strong {
  display: block;
  color: #243047;
}

.today-points {
  margin-left: auto;
  font-weight: 900;
  color: #17875b;
}

.today-points.spend {
  color: #d24d57;
}

.quiet-box {
  padding: 18px;
  border-radius: 18px;
  background: #f7f2e9;
}

.streak-ring {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-bottom: 18px;
}

.ring {
  width: 96px;
  height: 96px;
  flex: 0 0 96px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: conic-gradient(#f29f4b var(--progress), #ece3d6 0);
  position: relative;
  font-weight: 900;
  color: #163b4f;
}

.ring::after {
  content: '';
  position: absolute;
  inset: 10px;
  border-radius: 50%;
  background: #fffdf7;
}

.ring span {
  position: relative;
  z-index: 1;
}

.week-dots {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 8px;
}

.week-dot {
  min-height: 44px;
  display: grid;
  place-items: center;
  border-radius: 14px;
  background: #f1eadf;
  color: #8b725d;
  font-weight: 900;
}

.week-dot.active {
  color: #163b4f;
  background: #ffd66b;
}

.week-dot.today {
  outline: 3px solid rgba(37, 109, 123, 0.22);
}

.prize-focus {
  display: grid;
  grid-template-columns: 92px 1fr;
  gap: 16px;
  align-items: center;
}

.prize-image {
  width: 92px;
  height: 92px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 22px;
  background: linear-gradient(135deg, #fff2c7, #eaf7f5);
  font-size: 2.8rem;
}

.prize-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.prize-focus strong {
  display: block;
  margin-bottom: 6px;
  font-size: 1.15rem;
}

.prize-progress {
  height: 10px;
  margin: 14px 0 8px;
  border-radius: 999px;
  overflow: hidden;
  background: #ece3d6;
}

.prize-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, #256d7b, #f29f4b);
}

.state-card {
  min-height: 260px;
  display: grid;
  place-items: center;
  text-align: center;
}

.spinner,
.empty-icon {
  font-size: 4rem;
}

@media (max-width: 1180px) {
  .summary-grid,
  .quest-grid,
  .map-track {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .adventure-page {
    padding: 16px;
  }

  .hero-panel,
  .section-heading {
    flex-direction: column;
    align-items: stretch;
  }

  .summary-grid,
  .quest-grid,
  .map-track {
    grid-template-columns: 1fr;
  }
}
</style>
