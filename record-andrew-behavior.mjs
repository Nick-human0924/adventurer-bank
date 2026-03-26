import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agkemugaxhrsnbyiluw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheGhyc25ieWlsdXciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzE1NTk2MCwiZXhwIjoyMDUyNzMxOTYwfQ.6Q3o5PGKxDGvXTj4FzyDJC-0HWL1t6rvZeKR2rnQa4s'

const supabase = createClient(supabaseUrl, supabaseKey)

async function recordBehavior() {
  console.log('🔄 开始为申安哲记录行为...')
  
  // 1. 找到申安哲
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('id, name, current_balance, total_points')
    .ilike('name', '%安哲%')
  
  if (childError) {
    console.error('❌ 查找孩子失败:', childError)
    return
  }
  
  if (!children || children.length === 0) {
    console.error('❌ 未找到申安哲')
    return
  }
  
  const andrew = children[0]
  console.log('✅ 找到孩子:', andrew.name, 'ID:', andrew.id)
  console.log('   当前金币:', andrew.current_balance, '累计:', andrew.total_points)
  
  // 2. 找到"认真学习"或"作业完成"相关规则
  const { data: rules, error: ruleError } = await supabase
    .from('rules')
    .select('*')
    .eq('type', 'good')
    .eq('is_active', true)
    .or('name.ilike.%作业%,name.ilike.%学习%,name.ilike.%认真%')
    .limit(5)
  
  if (ruleError) {
    console.error('❌ 查找规则失败:', ruleError)
    return
  }
  
  let rule = null
  let points = 10
  if (rules && rules.length > 0) {
    rule = rules[0]
    points = rule.points
    console.log('✅ 找到规则:', rule.name, '积分:', rule.points)
  } else {
    console.log('⚠️ 未找到匹配规则，使用默认积分: 10')
  }
  
  // 3. 创建交易记录
  const { data: transaction, error: txError } = await supabase
    .from('transactions')
    .insert({
      child_id: andrew.id,
      points: points,
      type: 'earn',
      note: '作业写得又快又好，节约出2分半钟时间',
      rule_id: rule ? rule.id : null
    })
    .select()
    .single()
  
  if (txError) {
    console.error('❌ 创建交易记录失败:', txError)
    return
  }
  
  console.log('✅ 交易记录创建成功!')
  console.log('   获得积分:', transaction.points)
  console.log('   备注:', transaction.note)
  
  // 4. 更新孩子金币
  const newBalance = (andrew.current_balance || 0) + points
  const newTotal = (andrew.total_points || 0) + points
  
  const { error: updateError } = await supabase
    .from('children')
    .update({
      current_balance: newBalance,
      total_points: newTotal
    })
    .eq('id', andrew.id)
  
  if (updateError) {
    console.error('❌ 更新金币失败:', updateError)
    return
  }
  
  console.log('✅ 金币更新成功!')
  console.log('   新金币余额:', newBalance)
  console.log('   新累计积分:', newTotal)
  console.log('\n🎉 安哲的加分完成！')
}

recordBehavior().catch(console.error)
