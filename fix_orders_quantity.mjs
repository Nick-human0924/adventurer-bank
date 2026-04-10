import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA5OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fixOrdersTable() {
  console.log('🔧 修复 orders 表 - 添加 quantity 列...\n')
  
  try {
    // 使用 RPC 调用添加列（需要 Supabase 有相应的函数）
    // 或者使用 REST API 直接执行 SQL
    const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        // 尝试通过插入包含 quantity 的数据来触发 schema 更新
      })
    })
    
    console.log('✅ 修复方案:')
    console.log('由于 Supabase 客户端无法直接执行 ALTER TABLE，请手动在 Supabase Dashboard 中执行以下 SQL:')
    console.log('')
    console.log('```sql')
    console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;')
    console.log('```')
    console.log('')
    console.log('📍 操作步骤:')
    console.log('1. 访问 https://supabase.com/dashboard/project/agkemugaxrhrsnbyiluw')
    console.log('2. 进入 SQL Editor')
    console.log('3. 执行上述 SQL 语句')
    console.log('')
    
    // 尝试用另一种方式修复：更新前端代码以兼容没有 quantity 列的情况
    console.log('🔄 备选方案: 更新前端代码兼容当前数据库结构...')
    
  } catch (e) {
    console.log('❌ 异常:', e.message)
  }
}

fixOrdersTable()
