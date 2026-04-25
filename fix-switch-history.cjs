const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient(
  'https://agkemugaxrhrsnbyiluw.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk'
);

const FIX_DATES = ['2026-04-08', '2026-04-09', '2026-04-10'];

async function main() {
  // 1. 找到 "switch 打卡" 任务
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .ilike('title', '%switch%');
  
  if (taskErr || !tasks || tasks.length === 0) {
    console.error('找不到 switch 打卡 任务:', taskErr);
    process.exit(1);
  }
  
  const task = tasks[0];
  console.log('找到任务:', task.title, task.id);
  
  // 2. 获取其进度记录
  const { data: progresses, error: progErr } = await supabase
    .from('task_progress')
    .select('*')
    .eq('task_id', task.id);
  
  if (progErr || !progresses) {
    console.error('查询进度失败:', progErr);
    process.exit(1);
  }
  
  for (const progress of progresses) {
    console.log('当前进度:', progress.child_id, 'history长度:', (progress.completion_history || []).length);
    
    const history = [...(progress.completion_history || [])];
    let changed = false;
    
    for (const date of FIX_DATES) {
      const exists = history.some(h => h.date === date);
      if (!exists) {
        history.push({
          date,
          points: 20,
          rule_name: '按时完成书面作业'
        });
        console.log(`  追加 ${date}`);
        changed = true;
      } else {
        console.log(`  ${date} 已存在，跳过`);
      }
    }
    
    if (changed) {
      // 按日期排序
      history.sort((a, b) => new Date(a.date) - new Date(b.date));
      
      const streakCount = history.length;
      const isCompleted = streakCount >= (task.target_streak || 7);
      
      const { error: updateErr } = await supabase
        .from('task_progress')
        .update({
          completion_history: history,
          streak_count: streakCount,
          current_count: streakCount,
          status: isCompleted ? 'completed' : 'active'
        })
        .eq('id', progress.id);
      
      if (updateErr) {
        console.error('  更新失败:', updateErr);
      } else {
        console.log(`  ✅ 更新成功，新 streak: ${streakCount}/${task.target_streak || 7}`);
      }
    } else {
      console.log('  无需更新');
    }
  }
  
  console.log('\n完成');
}

main().catch(console.error);
