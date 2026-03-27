import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkTypeMismatch() {
  console.log('🔍 检查数据类型...\n')

  // 获取徽章定义
  const { data: badges } = await supabase
    .from('badges')
    .select('*')
    .limit(5)

  console.log('📋 徽章 unlock_condition 类型:')
  for (const b of badges || []) {
    const cond = b.unlock_condition
    console.log(`   ${b.name}:`)
    console.log(`     type: ${cond.type} (${typeof cond.type})`)
    console.log(`     min: ${cond.min} (${typeof cond.min})`)
  }

  // 模拟统计
  const stats = {
    totalPoints: 128,
    streakDays: 5
  }

  console.log('\n📊 模拟统计类型:')
  console.log(`   totalPoints: ${stats.totalPoints} (${typeof stats.totalPoints})`)
  console.log(`   streakDays: ${stats.streakDays} (${typeof stats.streakDays})`)

  // 测试比较
  console.log('\n🔍 比较测试:')
  const testCond = badges?.[0]?.unlock_condition
  if (testCond) {
    console.log(`   ${stats.totalPoints} >= ${testCond.min} : ${stats.totalPoints >= testCond.min}`)
    console.log(`   typeof comparison: ${typeof stats.totalPoints} >= ${typeof testCond.min}`)
  }
}

checkTypeMismatch()
