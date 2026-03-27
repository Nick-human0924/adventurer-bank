import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function simulateBadgeCheck() {
  console.log('🔍 模拟徽章检查逻辑...\n')

  const childId = 'b938a314-6258-45b9-934f-3b63f70561ae'

  // 1. 获取交易记录
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('child_id', childId)
    .order('created_at', { ascending: true })

  // 2. 计算统计
  const stats = {
    totalPoints: txs?.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.points, 0) || 0,
    streakDays: 0,
    daysActive: 0,
    redeemCount: txs?.filter(t => t.type === 'redeem').length || 0
  }

  // 计算活跃天数
  const activeDates = new Set()
  for (const tx of txs || []) {
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

  console.log('📊 孩子统计:')
  console.log(`   总积分: ${stats.totalPoints}`)
  console.log(`   活跃天数: ${stats.daysActive}`)
  console.log(`   连续天数: ${stats.streakDays}`)
  console.log(`   兑换次数: ${stats.redeemCount}`)
  console.log('')

  // 3. 获取徽章定义并检查哪些会解锁
  const { data: badges } = await supabase.from('badges').select('*')

  console.log('🏆 应解锁徽章:')
  let unlockCount = 0
  for (const badge of badges || []) {
    const cond = badge.unlock_condition
    let shouldUnlock = false
    
    switch (cond.type) {
      case 'total_points':
        shouldUnlock = stats.totalPoints >= cond.min
        break
      case 'streak_days':
        shouldUnlock = stats.streakDays >= cond.min
        break
      case 'days_active':
        shouldUnlock = stats.daysActive >= cond.min
        break
      case 'redeem_count':
        shouldUnlock = stats.redeemCount >= cond.min
        break
    }
    
    if (shouldUnlock) {
      console.log(`   ✅ ${badge.name} (${cond.type}: ${cond.min})`)
      unlockCount++
    }
  }
  
  console.log(`\n总共应解锁: ${unlockCount} 个徽章`)
}

simulateBadgeCheck()
