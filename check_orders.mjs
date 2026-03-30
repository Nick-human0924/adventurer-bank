import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkOrdersColumns() {
  console.log('🔍 检查 orders 表结构...\n')
  
  try {
    // 尝试插入一条测试数据，包含quantity列
    const { data, error } = await supabase
      .from('orders')
      .insert({
        child_id: '00000000-0000-0000-0000-000000000000',
        prize_id: '00000000-0000-0000-0000-000000000000',
        price: 100,
        price_type: 'coins',
        quantity: 1,
        status: 'completed',
        user_id: '00000000-0000-0000-0000-000000000000'
      })
      .select()
    
    if (error) {
      console.log('❌ 错误详情:', error.message)
      console.log('   错误代码:', error.code)
      
      if (error.message.includes('quantity')) {
        console.log('\n🔴 确认: quantity 列不存在!')
      }
    } else {
      console.log('✅ quantity 列存在，测试数据插入成功')
      // 删除测试数据
      await supabase.from('orders').delete().eq('id', data[0].id)
    }
  } catch (e) {
    console.log('❌ 异常:', e.message)
  }
  
  // 检查现有列
  console.log('\n📋 尝试查询所有列...')
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .limit(1)
    
    if (data && data.length > 0) {
      console.log('✅ 现有列:', Object.keys(data[0]).join(', '))
    } else if (error) {
      console.log('❌ 查询错误:', error.message)
    } else {
      console.log('⚠️ 表为空，无法确定列结构')
    }
  } catch (e) {
    console.log('❌ 异常:', e.message)
  }
}

checkOrdersColumns().then(() => {
  process.exit(0)
}).catch(err => {
  console.error('检查失败:', err)
  process.exit(1)
})
