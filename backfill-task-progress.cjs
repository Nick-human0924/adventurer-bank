const { createClient } = require('@supabase/supabase-js');

const URL = 'https://agkemugaxrhrsnbyiluw.supabase.co';
const KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk';

const supabase = createClient(URL, KEY);

const DATES_TO_FIX = ['2026-04-08', '2026-04-09', '2026-04-10'];

async function main() {
  // 1. 找到"按时完成书面作业"规则
  const { data: rules, error: ruleErr } = await supabase
    .from('rules')
    .select('*')
    .ilike('name', '%按时完成书面作业%');
  
  if (ruleErr || !rules || rules.length === 0) {
    console.error('找不到规则:', ruleErr);
    process.exit(1);
  }
  
  const rule = rules[0];
  console.log('找到规则:', rule.name, rule.id);
  
  // 2. 找到关联此规则的活动任务
  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'active')
    .or('task_type.eq.continuous,task_type.eq.cumulative,task_type.eq.single')
    .contains('linked_rule_ids', [rule.id]);
  
  if (taskErr) {
    console.error('查询任务失败:', taskErr);
    process.exit(1);
  }
  
  // 也查一下 linked_rule_ids 为空的旧任务
  const { data: allTasks, error: allTaskErr } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'active')
    .or('task_type.eq.continuous,task_type.eq.cumulative,task_type.eq.single');
  
  if (allTaskErr) {
    console.error('查询所有任务失败:', allTaskErr);
    process.exit(1);
  }
  
  const orphanTasks = (allTasks || []).filter(t => 
    !t.linked_rule_ids || t.linked_rule_ids.length === 0
  );
  
  const linkedTasks = (tasks || []);
  const allTargetTasks = [...linkedTasks, ...orphanTasks];
  
  console.log(`关联任务: ${linkedTasks.length} 个, 无主关联任务: ${orphanTasks.length} 个`);
  
  for (const task of allTargetTasks) {
    console.log(`\n处理任务: ${task.title} (${task.task_type})`);
    
    // 找到有这个任务的孩子的进度记录
    const { data: progresses, error: progErr } = await supabase
      .from('task_progress')
      .select('*')
      .eq('task_id', task.id);
    
    if (progErr) {
      console.error('查询进度失败:', progErr);
      continue;
    }
    
    for (const progress of (progresses || [])) {
      const childId = progress.child_id;
      let modified = false;
      
      for (const date of DATES_TO_FIX) {
        // 检查该孩子在这一天是否有此规则的交易记录
        const startOfDay = `${date}T00:00:00`;
        const endOfDay = `${date}T23:59:59`;
        
        const { data: txns, error: txErr } = await supabase
          .from('transactions')
          .select('*')
          .eq('child_id', childId)
          .eq('rule_id', rule.id)
          .gte('created_at', startOfDay)
          .lte('created_at', endOfDay);
        
        if (txErr) {
          console.error('查询交易失败:', txErr);
          continue;
        }
        
        if (!txns || txns.length === 0) continue;
        
        console.log(`  孩子 ${childId} 在 ${date} 有 ${txns.length} 条交易记录`);
        
        if (task.task_type === 'continuous') {
          const history = [...(progress.completion_history || [])];
          const alreadyExists = history.some(h => h.date === date);
          
          if (!alreadyExists) {
            history.push({
              date,
              rule_name: rule.name,
              rule_icon: rule.icon || rule.icon_emoji || '✓',
              points: rule.points
            });
            
            const streakCount = history.length;
            const targetStreak = task.target_streak || 7;
            const isCompleted = streakCount >= targetStreak;
            
            await supabase.from('task_progress').update({
              completion_history: history,
              streak_count: streakCount,
              current_count: history.length,
              last_completed_date: date,
              status: isCompleted ? 'completed' : 'active'
            }).eq('id', progress.id);
            
            console.log(`    → 已补录 continuous 记录，当前 streak: ${streakCount}/${targetStreak}`);
            modified = true;
          } else {
            console.log(`    → 已存在 continuous 记录，跳过`);
          }
        } else if (task.task_type === 'cumulative' || task.task_type === 'single') {
          // 查出此前所有关联此规则的交易数
          const { count, error: countErr } = await supabase
            .from('transactions')
            .select('*', { count: 'exact', head: true })
            .eq('child_id', childId)
            .eq('rule_id', rule.id)
            .lte('created_at', endOfDay);
          
          if (countErr) {
            console.error('计数失败:', countErr);
            continue;
          }
          
          const newCount = count || progress.current_count || 0;
          const targetCount = task.target_count || (task.task_type === 'single' ? 1 : 5);
          const isCompleted = newCount >= targetCount;
          
          await supabase.from('task_progress').update({
            current_count: newCount,
            last_completed_date: date,
            status: isCompleted ? 'completed' : 'active'
          }).eq('id', progress.id);
          
          console.log(`    → 已补录 cumulative 记录，当前 count: ${newCount}/${targetCount}`);
          modified = true;
        }
      }
      
      if (!modified) {
        console.log(`  孩子 ${childId}: 无需补录`);
      }
    }
  }
  
  console.log('\n✅ 补录完成');
}

main().catch(console.error);
