import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fixDatabase() {
  console.log('🔧 开始修复数据库...\n')
  
  const results = []
  
  // 1. 检查 orders 表是否存在
  console.log('1️⃣ 检查 orders 表...')
  try {
    const { data, error } = await supabase.from('orders').select('id').limit(1)
    if (error && error.code === '42P01') {
      console.log('   ❌ orders 表不存在，尝试创建...')
      results.push({ table: 'orders', exists: false, error: error.message })
    } else if (error) {
      console.log('   ⚠️ 检查失败:', error.message)
      results.push({ table: 'orders', exists: 'unknown', error: error.message })
    } else {
      console.log('   ✅ orders 表存在')
      results.push({ table: 'orders', exists: true })
    }
  } catch (e) {
    console.log('   ❌ 异常:', e.message)
    results.push({ table: 'orders', exists: false, error: e.message })
  }
  
  // 2. 检查 prizes 表是否存在
  console.log('2️⃣ 检查 prizes 表...')
  try {
    const { data, error } = await supabase.from('prizes').select('id').limit(1)
    if (error && error.code === '42P01') {
      console.log('   ❌ prizes 表不存在，尝试创建...')
      results.push({ table: 'prizes', exists: false, error: error.message })
    } else if (error) {
      console.log('   ⚠️ 检查失败:', error.message)
      results.push({ table: 'prizes', exists: 'unknown', error: error.message })
    } else {
      console.log('   ✅ prizes 表存在')
      results.push({ table: 'prizes', exists: true })
    }
  } catch (e) {
    console.log('   ❌ 异常:', e.message)
    results.push({ table: 'prizes', exists: false, error: e.message })
  }
  
  // 3. 检查 children 表的 gem_balance 列
  console.log('3️⃣ 检查 gem_balance 列...')
  try {
    const { data, error } = await supabase.from('children').select('gem_balance').limit(1)
    if (error && error.message.includes('column')) {
      console.log('   ❌ gem_balance 列不存在')
      results.push({ column: 'gem_balance', exists: false, error: error.message })
    } else if (error) {
      console.log('   ⚠️ 检查失败:', error.message)
      results.push({ column: 'gem_balance', exists: 'unknown', error: error.message })
    } else {
      console.log('   ✅ gem_balance 列存在')
      results.push({ column: 'gem_balance', exists: true })
    }
  } catch (e) {
    console.log('   ❌ 异常:', e.message)
    results.push({ column: 'gem_balance', exists: false, error: e.message })
  }
  
  console.log('\n📊 修复结果汇总:')
  console.log(JSON.stringify(results, null, 2))
  
  // 返回结果给调用者
  return results
}

fixDatabase().then(results => {
  process.exit(0)
}).catch(err => {
  console.error('修复失败:', err)
  process.exit(1)
})
