import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debugTransactions() {
  console.log('🔍 检查 3月27日 的交易记录...\n')

  // 获取今天的交易（使用本地时区 2026-03-27）
  const { data: txs, error } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'earn')
    .gte('created_at', '2026-03-27')
    .lt('created_at', '2026-03-28')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ 查询失败:', error)
    return
  }

  console.log(`找到 ${txs?.length || 0} 条 3月27日 的加分记录\n`)

  for (const tx of txs || []) {
    console.log(`📋 记录: ${tx.note}`)
    console.log(`   时间: ${tx.created_at}`)
    console.log(`   分数: +${tx.points}`)
    console.log(`   rule_id: ${tx.rule_id}`)
    console.log(`   child_id: ${tx.child_id}`)
    console.log('')
  }

  // 检查 task_progress 表
  console.log('\n📊 检查 task_progress 表...\n')
  
  const { data: progresses } = await supabase
    .from('task_progress')
    .select('*')

  console.log(`找到 ${progresses?.length || 0} 条进度记录\n`)

  for (const p of progresses || []) {
    console.log(`任务: ${p.task_id}`)
    console.log(`  child: ${p.child_id}`)
    console.log(`  combo_progress:`, JSON.stringify(p.combo_progress, null, 2))
    console.log('')
  }
}

debugTransactions()
