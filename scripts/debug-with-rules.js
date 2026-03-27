import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debugWithRules() {
  console.log('🔍 检查交易记录（关联规则名称）...\n')

  // 获取最近的交易记录
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'earn')
    .order('created_at', { ascending: false })
    .limit(30)

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  // 获取所有规则
  const { data: rules } = await supabase
    .from('rules')
    .select('id, name')

  const ruleMap = {}
  for (const r of rules || []) {
    ruleMap[r.id] = r.name
  }

  console.log(`找到 ${txs?.length || 0} 条记录\n`)

  for (const tx of txs || []) {
    const d = new Date(tx.created_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const ruleName = ruleMap[tx.rule_id] || '未知规则'
    
    console.log(`📅 ${dateStr} | 行为: ${ruleName}`)
    console.log(`   备注: ${tx.note}`)
    console.log(`   rule_id: ${tx.rule_id}`)
    console.log(`   时间: ${tx.created_at}`)
    console.log('')
  }
}

debugWithRules()
