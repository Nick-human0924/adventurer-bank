import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function check26thData() {
  console.log('🔍 检查 3月26日 读英语记录...\n')

  // 1. 获取26号的读英语交易
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'earn')
    .gte('created_at', '2026-03-26')
    .lt('created_at', '2026-03-27')

  console.log('📋 3月26日所有加分记录:')
  for (const tx of txs || []) {
    console.log(`   - ${tx.note} | ${tx.created_at} | rule_id: ${tx.rule_id}`)
  }
  console.log('')

  // 2. 检查当前 combo_progress
  const { data: progress } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', '5bb778bc-6547-4d37-93eb-64c3a7fe877a')
    .single()

  console.log('📊 当前 combo_progress:')
  console.log(JSON.stringify(progress?.combo_progress, null, 2))
}

check26thData()
