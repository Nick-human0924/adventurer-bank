import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function debugTaskProgress() {
  console.log('🔍 调试任务进度数据...\n')

  // 1. 获取所有任务
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select('*')
    .ilike('title', '%Switch%')

  if (taskError) {
    console.error('❌ 获取任务失败:', taskError)
    return
  }

  console.log(`找到 ${tasks?.length || 0} 个组合任务\n`)

  for (const task of tasks || []) {
    console.log(`📋 任务: ${task.title} (${task.task_type})`)
    console.log(`   ID: ${task.id}`)
    console.log(`   状态: ${task.status}`)
    console.log(`   关联规则IDs:`, task.linked_rule_ids)
    console.log(`   全部字段:`, Object.keys(task))
    console.log()

    // 2. 获取任务进度
    const { data: progress } = await supabase
      .from('task_progress')
      .select('*')
      .eq('task_id', task.id)

    console.log(`   进度记录: ${progress?.length || 0} 条`)

    for (const p of progress || []) {
      console.log(`\n   📊 进度详情 (child_id: ${p.child_id}):`)
      console.log(`      combo_progress:`, JSON.stringify(p.combo_progress, null, 2))
      console.log(`      current_count: ${p.current_count}`)
      console.log(`      status: ${p.status}`)

      // 3. 获取关联规则详情
      if (task.linked_rule_ids?.length > 0) {
        const { data: rules } = await supabase
          .from('rules')
          .select('id, name, user_id')
          .in('id', task.linked_rule_ids)

        console.log(`\n   📋 关联规则详情:`)
        for (const rule of rules || []) {
          const progressData = p.combo_progress?.[rule.id]
          console.log(`      - ${rule.name} (${rule.id})`)
          console.log(`        完成状态:`, progressData || '未记录')
          console.log(`        user_id: ${rule.user_id}`)
        }
      }
    }
    console.log('\n' + '='.repeat(60) + '\n')
  }
}

debugTaskProgress()
