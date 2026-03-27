import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkTaskProgressDetail() {
  console.log('🔍 检查 Switch套餐 任务进度详情...\n')

  // 找到任务
  const { data: task } = await supabase
    .from('tasks')
    .select('*')
    .ilike('title', '%Switch%')
    .single()

  if (!task) {
    console.log('❌ 未找到任务')
    return
  }

  console.log(`📋 任务: ${task.title}`)
  console.log(`   关联规则:`, task.linked_rule_ids)
  console.log('')

  // 获取进度记录
  const { data: progresses } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', task.id)

  console.log(`找到 ${progresses?.length || 0} 条进度记录\n`)

  for (const p of progresses || []) {
    console.log(`📊 进度记录 (${p.id}):`)
    console.log(`   孩子: ${p.child_id}`)
    console.log(`   状态: ${p.status}`)
    console.log(`   combo_progress:`, JSON.stringify(p.combo_progress, null, 2))
    console.log(`   completion_history:`, JSON.stringify(p.completion_history, null, 2))
    console.log(`   current_count: ${p.current_count}`)
    console.log('')
  }

  // 获取相关规则名称
  if (task.linked_rule_ids?.length > 0) {
    const { data: rules } = await supabase
      .from('rules')
      .select('id, name')
      .in('id', task.linked_rule_ids)

    console.log('📋 关联规则:')
    for (const r of rules || []) {
      console.log(`   - ${r.name} (${r.id})`)
    }
  }
}

checkTaskProgressDetail()
