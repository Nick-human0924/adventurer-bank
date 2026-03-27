import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkBadgeStatus() {
  console.log('🔍 检查徽章状态...\n')

  // 1. 获取所有孩子
  const { data: children } = await supabase.from('children').select('*')
  console.log(`找到 ${children?.length || 0} 个孩子\n`)

  // 2. 获取所有徽章定义
  const { data: badges } = await supabase.from('badges').select('*')
  console.log(`找到 ${badges?.length || 0} 个徽章定义\n`)

  // 3. 获取所有 child_badges 记录
  const { data: childBadges } = await supabase.from('child_badges').select('*')
  console.log(`找到 ${childBadges?.length || 0} 条已解锁记录\n`)

  // 4. 检查每个孩子的情况
  for (const child of children || []) {
    console.log(`\n👶 孩子: ${child.name} (${child.id})`)
    
    // 获取孩子的积分
    const { data: txs } = await supabase
      .from('transactions')
      .select('points, type')
      .eq('child_id', child.id)
    
    const totalPoints = txs?.filter(t => t.type === 'earn').reduce((sum, t) => sum + t.points, 0) || 0
    console.log(`   总积分: ${totalPoints}`)

    // 获取已解锁徽章
    const unlocked = childBadges?.filter(cb => cb.child_id === child.id) || []
    console.log(`   已解锁徽章: ${unlocked.length} 个`)
    
    for (const ub of unlocked) {
      const badge = badges?.find(b => b.id === ub.badge_id)
      if (badge) {
        const cond = badge.unlock_condition
        let shouldUnlock = false
        
        if (cond.type === 'total_points') {
          shouldUnlock = totalPoints >= cond.min
        }
        // 其他条件...
        
        const status = shouldUnlock ? '✅ 应解锁' : '❌ 不应解锁'
        console.log(`      - ${badge.name} (${badge.code}) - ${status}`)
      }
    }
  }
}

checkBadgeStatus()
