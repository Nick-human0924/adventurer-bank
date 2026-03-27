// 检查徽章表状态
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkBadges() {
  console.log('🔍 检查徽章表状态...\n')

  // 检查 badges 表
  const { data: badges, error: badgesError } = await supabase
    .from('badges')
    .select('*')
    .limit(5)

  if (badgesError) {
    console.error('❌ badges 表错误:', badgesError.message)
  } else {
    console.log(`✅ badges 表存在，有 ${badges?.length || 0} 条记录`)
    if (badges?.length > 0) {
      console.log('   示例:', badges[0].name, badges[0].icon)
    }
  }

  // 检查 child_badges 表
  const { data: childBadges, error: cbError } = await supabase
    .from('child_badges')
    .select('*')
    .limit(5)

  if (cbError) {
    console.error('❌ child_badges 表错误:', cbError.message)
  } else {
    console.log(`✅ child_badges 表存在，有 ${childBadges?.length || 0} 条记录`)
  }
}

checkBadges()
