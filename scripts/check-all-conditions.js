import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkAllBadgeConditions() {
  console.log('🔍 检查所有徽章条件...\n')

  const childId = 'b938a314-6258-45b9-934f-3b63f70561ae'

  // 获取交易记录
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('child_id', childId)

  // 计算统计
  const stats = {
    totalPoints: txs?.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.points, 0) || 0,
    streakDays: 5, // 简化处理
    daysActive: 5,
    redeemCount: txs?.filter(t => t.type === 'redeem').length || 0
  }

  console.log('📊 孩子统计:')
  console.log(`   总积分: ${stats.totalPoints}`)
  console.log(`   活跃天数: ${stats.daysActive}`)
  console.log(`   连续天数: ${stats.streakDays}`)
  console.log(`   兑换次数: ${stats.redeemCount}`)
  console.log('')

  // 获取所有徽章
  const { data: badges } = await supabase.from('badges').select('*')

  console.log('🏆 徽章条件检查:')
  let unlockCount = 0
  for (const badge of badges || []) {
    const cond = badge.unlock_condition
    let shouldUnlock = false
    let reason = ''
    
    switch (cond.type) {
      case 'total_points':
        shouldUnlock = stats.totalPoints >= cond.min
        reason = `${stats.totalPoints}/${cond.min}分`
        break
      case 'streak_days':
        shouldUnlock = stats.streakDays >= cond.min
        reason = `${stats.streakDays}/${cond.min}天`
        break
      case 'days_active':
        shouldUnlock = stats.daysActive >= cond.min
        reason = `${stats.daysActive}/${cond.min}天`
        break
      case 'redeem_count':
        shouldUnlock = stats.redeemCount >= cond.min
        reason = `${stats.redeemCount}/${cond.min}次`
        break
      case 'category_points':
        shouldUnlock = false
        reason = '分类积分未计算'
        break
      case 'full_month':
        shouldUnlock = false
        reason = '全月未计算'
        break
      default:
        shouldUnlock = false
        reason = `未知类型: ${cond.type}`
    }
    
    if (shouldUnlock) {
      console.log(`   ✅ ${badge.name} | ${cond.type} | ${reason}`)
      unlockCount++
    } else {
      console.log(`   ⭕ ${badge.name} | ${cond.type} | ${reason}`)
    }
  }
  
  console.log(`\n应解锁: ${unlockCount}/${badges?.length || 0} 个徽章`)
}

checkAllBadgeConditions()
