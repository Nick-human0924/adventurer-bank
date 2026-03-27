import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function fixTaskProgress() {
  console.log('🔧 修复 Switch套餐 任务进度...\n')

  // 1. 找到 Switch套餐 任务
  const { data: task, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .ilike('title', '%Switch%')
    .single()

  if (taskError || !task) {
    console.log('❌ 未找到 Switch套餐 任务')
    return
  }

  console.log(`📋 任务: ${task.title}`)
  console.log(`   ID: ${task.id}`)
  console.log(`   类型: ${task.task_type}`)
  console.log(`   关联规则:`, task.linked_rule_ids)
  console.log(`   孩子:`, task.child_ids)
  console.log(`   用户: ${task.user_id}`)
  console.log('')

  // 2. 获取读英语规则的 ID
  const { data: rule } = await supabase
    .from('rules')
    .select('id, name')
    .ilike('name', '%读英语%')
    .single()

  if (!rule) {
    console.log('❌ 未找到 读英语 规则')
    return
  }

  console.log(`📋 读英语规则: ${rule.name} (${rule.id})\n`)

  // 3. 为每个孩子创建/更新 task_progress
  for (const childId of task.child_ids || []) {
    console.log(`👶 处理孩子: ${childId}`)

    // 检查是否已有进度记录
    const { data: existing } = await supabase
      .from('task_progress')
      .select('*')
      .eq('task_id', task.id)
      .eq('child_id', childId)
      .single()

    if (existing) {
      console.log('   ✅ 已有进度记录，跳过')
      continue
    }

    // 创建新进度记录
    const { data: newProgress, error: createError } = await supabase
      .from('task_progress')
      .insert({
        task_id: task.id,
        child_id: childId,
        user_id: task.user_id,
        combo_progress: {},
        completion_history: [],
        current_count: 0,
        streak_count: 0,
        status: 'active'
      })
      .select()
      .single()

    if (createError) {
      console.error('   ❌ 创建失败:', createError.message)
    } else {
      console.log('   ✅ 创建成功:', newProgress.id)
    }
  }

  console.log('\n🎉 修复完成！')
}

fixTaskProgress()
