import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debugAllTransactions() {
  console.log('🔍 检查最近的交易记录...\n')

  // 获取所有交易
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'earn')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`找到 ${txs?.length || 0} 条记录\n`)

  for (const tx of txs || []) {
    const d = new Date(tx.created_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    console.log(`📋 ${tx.note}`)
    console.log(`   本地日期: ${dateStr}`)
    console.log(`   原始时间: ${tx.created_at}`)
    console.log(`   分数: +${tx.points}`)
    console.log(`   rule_id: ${tx.rule_id}`)
    console.log('')
  }
}

debugAllTransactions()
