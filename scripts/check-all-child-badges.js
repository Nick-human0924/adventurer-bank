import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkAllChildBadges() {
  console.log('🔍 检查所有 child_badges 记录...\n')

  // 不限制 child_id，查询所有记录
  const { data, error } = await supabase
    .from('child_badges')
    .select('*')

  if (error) {
    console.error('❌ 查询错误:', error)
    return
  }

  console.log(`找到 ${data?.length || 0} 条记录\n`)

  // 获取徽章定义
  const { data: badges } = await supabase.from('badges').select('id, name')
  const badgeMap = {}
  for (const b of badges || []) {
    badgeMap[b.id] = b.name
  }

  // 获取孩子信息
  const { data: children } = await supabase.from('children').select('id, name')
  const childMap = {}
  for (const c of children || []) {
    childMap[c.id] = c.name
  }

  for (const record of data || []) {
    console.log(`📋 child_id: ${record.child_id} (${childMap[record.child_id] || '未知'})`)
    console.log(`   badge_id: ${record.badge_id}`)
    console.log(`   徽章名: ${badgeMap[record.badge_id] || '未知'}`)
    console.log(`   unlocked_at: ${record.unlocked_at}`)
    console.log(`   is_new: ${record.is_new}`)
    console.log('')
  }
}

checkAllChildBadges()
