import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function syncHistoricalData() {
  console.log('🔄 同步历史数据到 combo_progress...\n')

  const TASK_ID = '5bb778bc-6547-4d37-93eb-64c3a7fe877a'
  const READING_RULE_ID = '7c58562c-d817-4a0f-8136-bdf0fc05b186'
  
  // 1. 获取当前 combo_progress
  const { data: progress } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', TASK_ID)
    .single()

  let comboProgress = progress?.combo_progress || {}
  console.log('📊 当前 combo_progress:', JSON.stringify(comboProgress, null, 2))

  // 2. 查询所有读英语记录
  const { data: txs } = await supabase
    .from('transactions')
    .select('*')
    .eq('type', 'earn')
    .eq('rule_id', READING_RULE_ID)
    .order('created_at', { ascending: true })

  console.log(`\n📋 找到 ${txs?.length || 0} 条读英语记录`)

  // 3. 按日期整理
  const dateMap = {}
  for (const tx of txs || []) {
    const d = new Date(tx.created_at)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    
    if (!dateMap[dateStr]) {
      dateMap[dateStr] = []
    }
    dateMap[dateStr].push(tx)
  }

  console.log('\n📅 按日期统计:')
  for (const [date, records] of Object.entries(dateMap)) {
    console.log(`   ${date}: ${records.length} 条记录`)
    // 添加到 combo_progress
    comboProgress[READING_RULE_ID] = {
      date: date,
      completed: true
    }
  }

  console.log('\n📝 更新后的 combo_progress:', JSON.stringify(comboProgress, null, 2))

  // 4. 更新数据库 - 需要为每个日期都记录，但 combo_progress 结构只能存一个日期
  // 实际上 combo_progress 应该按 {rule_id: {date, completed}} 存储，但只能存最新的一天
  // 需要改为存储每个日期的完成状态
  
  // 修正：combo_progress 应该支持多天记录
  // 格式: {rule_id: [{date, completed}, ...]}
  
  const multiDayProgress = {}
  for (const [date, records] of Object.entries(dateMap)) {
    if (!multiDayProgress[READING_RULE_ID]) {
      multiDayProgress[READING_RULE_ID] = []
    }
    multiDayProgress[READING_RULE_ID].push({
      date: date,
      completed: true
    })
  }

  console.log('\n📝 多天记录格式:', JSON.stringify(multiDayProgress, null, 2))

  // 但现有代码结构只支持单天，让我检查 Tasks.vue 如何使用 combo_progress
  console.log('\n⚠️ 注意：现有代码 combo_progress[rule_id] 是单对象格式，不是数组')
  console.log('需要修改 Tasks.vue 的查询逻辑，直接从 transactions 查询历史记录')
}

syncHistoricalData()
