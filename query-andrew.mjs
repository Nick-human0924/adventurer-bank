// 查询申安哲积分详情
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function queryAndrewPoints() {
  try {
    // 1. 查询所有孩子，找到申安哲
    const { data: children, error: childrenError } = await supabase
      .from('children')
      .select('*')
    
    if (childrenError) {
      console.error('查询孩子失败:', childrenError)
      return
    }
    
    console.log('=== 所有孩子信息 ===')
    for (const child of children) {
      console.log(`\nID: ${child.id}`)
      console.log(`姓名: ${child.name}`)
      console.log(`当前余额: ${child.current_balance}`)
      console.log(`总积分: ${child.total_points}`)
      console.log(`别名: ${JSON.stringify(child.aliases)}`)
      console.log(`家庭ID: ${child.family_id}`)
      console.log(`---`)
    }
    
    // 2. 找到申安哲
    const andrew = children.find(c => 
      c.name === '申安哲' || 
      (c.aliases && c.aliases.includes('andrew'))
    )
    
    if (!andrew) {
      console.log('\n❌ 未找到申安哲的信息')
      return
    }
    
    console.log('\n=== 申安哲详细信息 ===')
    console.log(`ID: ${andrew.id}`)
    console.log(`姓名: ${andrew.name}`)
    console.log(`当前余额: ${andrew.current_balance}`)
    console.log(`总积分: ${andrew.total_points}`)
    console.log(`头像: ${andrew.avatar}`)
    
    // 3. 查询该孩子的所有交易记录
    const { data: transactions, error: txError } = await supabase
      .from('transactions')
      .select('*')
      .eq('child_id', andrew.id)
      .order('created_at', { ascending: false })
    
    if (txError) {
      console.error('查询交易记录失败:', txError)
      return
    }
    
    console.log(`\n=== 申安哲的交易记录 (共${transactions.length}条) ===`)
    
    let totalEarned = 0
    let totalSpent = 0
    
    for (const tx of transactions.slice(0, 30)) {
      const date = new Date(tx.created_at).toLocaleString('zh-CN')
      console.log(`\n[${date}]`)
      console.log(`  类型: ${tx.type}`)
      console.log(`  积分: ${tx.points > 0 ? '+' : ''}${tx.points}`)
      console.log(`  备注: ${tx.note || '无'}`)
      
      if (tx.type === 'earn') {
        totalEarned += tx.points
      } else if (tx.type === 'spend') {
        totalSpent += Math.abs(tx.points)
      }
    }
    
    console.log('\n=== 统计 ===')
    console.log(`总赚取: ${totalEarned}`)
    console.log(`总消费: ${totalSpent}`)
    console.log(`净积分: ${totalEarned - totalSpent}`)
    console.log(`\n数据库当前余额: ${andrew.current_balance}`)
    console.log(`计算得出的余额: ${totalEarned - totalSpent}`)
    
    if (andrew.current_balance !== (totalEarned - totalSpent)) {
      console.log('\n⚠️ 警告: 数据库余额与交易记录计算结果不匹配!')
      console.log(`差额: ${andrew.current_balance - (totalEarned - totalSpent)}`)
    }
    
  } catch (error) {
    console.error('查询失败:', error)
  }
}

queryAndrewPoints()
