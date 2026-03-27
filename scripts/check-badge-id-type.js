import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkBadgeIdType() {
  console.log('🔍 检查 badge_id 类型...\n')

  // 获取徽章定义
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .limit(3)

  console.log('📋 徽章定义 ID 示例:')
  for (const b of badges || []) {
    console.log(`   ${b.name}: ${b.id} (类型: ${typeof b.id})`)
  }

  // 检查 child_badges
  const { data: childBadges } = await supabase
    .from('child_badges')
    .select('*')
    .limit(3)

  console.log('\n📊 child_badges 记录:')
  for (const cb of childBadges || []) {
    console.log(`   badge_id: ${cb.badge_id} (类型: ${typeof cb.badge_id})`)
  }

  // 测试字符串比较
  if (badges?.length > 0 && childBadges?.length > 0) {
    const badgeId = badges[0].id
    const childBadgeId = childBadges[0].badge_id
    console.log(`\n🔍 比较测试:`)
    console.log(`   徽章ID: "${badgeId}"`)
    console.log(`   记录ID: "${childBadgeId}"`)
    console.log(`   直接比较: ${badgeId === childBadgeId}`)
    console.log(`   toString比较: ${badgeId.toString() === childBadgeId.toString()}`)
  }
}

checkBadgeIdType()
