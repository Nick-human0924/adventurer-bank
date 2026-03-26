import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://agkemugaxhrsnbyiluw.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheGhyc25ieWlsdXciLCJyb2xlIjoiYW5vbiIsImlhdCI6MTczNzE1NTk2MCwiZXhwIjoyMDUyNzMxOTYwfQ.6Q3o5PGKxDGvXTj4FzyDJC-0HWL1t6rvZeKR2rnQa4s'

const supabase = createClient(supabaseUrl, supabaseKey)

async function recordBehaviors() {
  console.log('🔄 开始为申安哲记录行为...\n')
  
  // 1. 找到申安哲
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('id, name, current_balance, total_points')
    .ilike('name', '%安哲%')
  
  if (childError) {
    console.error('❌ 查找孩子失败:', childError.message)
    process.exit(1)
  }
  
  if (!children || children.length === 0) {
    console.error('❌ 未找到申安哲')
    process.exit(1)
  }
  
  const andrew = children[0]
  console.log('✅ 找到孩子:', andrew.name)
  console.log('   当前金币:', andrew.current_balance, '累计:', andrew.total_points)
  
  // 定义两个行为
  const behaviors = [
    {
      note: '作业写得又快又好，节约出2分半钟时间',
      keywords: ['作业', '学习', '认真'],
      defaultPoints: 10
    },
    {
      note: '帮助欣欣小朋友做作业',
      keywords: ['帮助', '助人', '乐于助人'],
      defaultPoints: 8
    }
  ]
  
  let totalPoints = 0
  
  for (const behavior of behaviors) {
    console.log(`\n📝 行为: ${behavior.note}`)
    
    // 查找匹配规则
    let query = supabase
      .from('rules')
      .select('*')
      .eq('type', 'good')
      .eq('is_active', true)
    
    const { data: rules, error: ruleError } = await query
      .or(behavior.keywords.map(k => `name.ilike.%${k}%`).join(','))
      .limit(1)
    
    let rule = null
    let points = behavior.defaultPoints
    
    if (!ruleError && rules && rules.length > 0) {
      rule = rules[0]
      points = rule.points
      console.log('   ✅ 匹配规则:', rule.name, `(${points}分)`)
    } else {
      console.log('   ⚠️ 使用默认积分:', points, '分')
    }
    
    // 创建交易记录
    const { error: txError } = await supabase
      .from('transactions')
      .insert({
        child_id: andrew.id,
        points: points,
        type: 'earn',
        note: behavior.note,
        rule_id: rule ? rule.id : null
      })
    
    if (txError) {
      console.error('   ❌ 记录失败:', txError.message)
      continue
    }
    
    console.log('   ✅ 记录成功! +', points, '金币')
    totalPoints += points
  }
  
  // 更新孩子总金币
  const newBalance = (andrew.current_balance || 0) + totalPoints
  const newTotal = (andrew.total_points || 0) + totalPoints
  
  const { error: updateError } = await supabase
    .from('children')
    .update({
      current_balance: newBalance,
      total_points: newTotal
    })
    .eq('id', andrew.id)
  
  if (updateError) {
    console.error('\n❌ 更新金币失败:', updateError.message)
    process.exit(1)
  }
  
  console.log('\n═══════════════════════════════════')
  console.log('🎉 安哲今天共获得', totalPoints, '金币!')
  console.log('   新金币余额:', newBalance)
  console.log('   新累计积分:', newTotal)
  console.log('═══════════════════════════════════')
}

recordBehaviors().catch(err => {
  console.error('错误:', err.message)
  process.exit(1)
})
