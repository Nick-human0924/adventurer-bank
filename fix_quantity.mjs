import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function addQuantityColumn() {
  console.log('🔧 尝试添加 quantity 列到 orders 表...\n')
  
  // 方法1: 尝试使用 rpc pg_execute (如果有权限)
  try {
    const { data, error } = await supabase.rpc('pg_execute', {
      query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1'
    })
    
    if (error) {
      console.log('方法1 (pg_execute) 失败:', error.message)
    } else {
      console.log('✅ 方法1 成功! quantity 列已添加')
      return true
    }
  } catch (e) {
    console.log('方法1 异常:', e.message)
  }
  
  // 方法2: 尝试使用 postgrest 的 admin 接口
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        query: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1'
      })
    })
    
    if (response.ok) {
      console.log('✅ 方法2 成功!')
      return true
    } else {
      const error = await response.json()
      console.log('方法2 失败:', error.message || '未知错误')
    }
  } catch (e) {
    console.log('方法2 异常:', e.message)
  }
  
  // 方法3: 直接 HTTP 请求尝试不同的端点
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/alter_table`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sql: 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1'
      })
    })
    
    const result = await response.json()
    if (response.ok) {
      console.log('✅ 方法3 成功!')
      return true
    } else {
      console.log('方法3 失败:', result.message || '未知错误')
    }
  } catch (e) {
    console.log('方法3 异常:', e.message)
  }
  
  return false
}

async function workaroundFix() {
  console.log('\n⚠️ 自动API修复失败，尝试替代方案...\n')
  
  // 检查是否可以修改Mall.vue中的代码来兼容
  console.log('📋 检查 Mall.vue 代码中 quantity 的使用...')
  console.log('   可以尝试修改代码，移除 quantity 字段的插入')
  console.log('   但这会影响多数量兑换功能')
  
  return false
}

async function main() {
  const success = await addQuantityColumn()
  
  if (!success) {
    await workaroundFix()
    console.log('\n🔴 API修复失败')
    console.log('\n💡 解决方案:')
    console.log('1. 请在 Supabase SQL Editor 中手动执行以下SQL:')
    console.log('')
    console.log('   ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;')
    console.log('')
    console.log('2. 或者我可以修改代码临时绕过此问题')
    process.exit(1)
  } else {
    console.log('\n✅ 修复成功!')
    process.exit(0)
  }
}

main()
