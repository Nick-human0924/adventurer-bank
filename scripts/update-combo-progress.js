import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function updateComboProgress() {
  console.log('📝 更新 Switch套餐 combo_progress...\n')

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

  // 获取进度记录
  const { data: progress } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', task.id)
    .single()

  if (!progress) {
    console.log('❌ 未找到进度记录')
    return
  }

  console.log('📊 当前 combo_progress:', JSON.stringify(progress.combo_progress, null, 2))
  console.log('')

  // 添加 27号 读英语完成记录
  const newComboProgress = {
    ...progress.combo_progress,
    '7c58562c-d817-4a0f-8136-bdf0fc05b186': {  // 读英语规则ID
      date: '2026-03-27',
      completed: true
    }
  }

  console.log('📝 新的 combo_progress:', JSON.stringify(newComboProgress, null, 2))
  console.log('')

  // 更新数据库
  const { error } = await supabase
    .from('task_progress')
    .update({ combo_progress: newComboProgress })
    .eq('id', progress.id)

  if (error) {
    console.error('❌ 更新失败:', error.message)
  } else {
    console.log('✅ 更新成功！')
  }
}

updateComboProgress()
