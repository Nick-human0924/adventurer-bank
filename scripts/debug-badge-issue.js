import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debugBadgeIssue() {
  console.log('🔍 调试徽章问题...\n')

  const childId = 'b938a314-6258-45b9-934f-3b63f70561ae'

  // 1. 检查 child_badges 表中的所有记录
  const { data: childBadges, error: cbError } = await supabase
    .from('child_badges')
    .select('*')
    .eq('child_id', childId)

  console.log(`找到 ${childBadges?.length || 0} 条 child_badges 记录`)
  
  if (cbError) {
    console.error('❌ 查询错误:', cbError)
  }

  // 2. 获取徽章定义
  const { data: badges } = await supabase
    .from('badges')
    .select('*')

  console.log(`\n📋 徽章定义 (${badges?.length || 0} 个):`)
  for (const b of badges || []) {
    const unlocked = childBadges?.some(cb => cb.badge_id === b.id)
    console.log(`   ${unlocked ? '✅' : '⭕'} ${b.name} (${b.code})`)
  }

  // 3. 检查 child_badges 的具体内容
  console.log('\n📊 child_badges 记录详情:')
  for (const cb of childBadges || []) {
    const badge = badges?.find(b => b.id === cb.badge_id)
    console.log(`   - badge_id: ${cb.badge_id}`)
    console.log(`     徽章名: ${badge?.name || '未知'}`)
    console.log(`     解锁时间: ${cb.unlocked_at}`)
    console.log(`     is_new: ${cb.is_new}`)
  }
}

debugBadgeIssue()
