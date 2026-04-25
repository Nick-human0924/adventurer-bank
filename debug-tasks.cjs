const { createClient } = require('./node_modules/@supabase/supabase-js');

const supabase = createClient('https://agkemugaxhrsnbyiluw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.HBnLMH5P6PAqVwozXvudMXenn816OQLGQSdtbLcjLbk');

async function main() {
  const { data: rules } = await supabase.from('rules').select('*').ilike('name', '%书面%');
  console.log('规则:', rules);
  
  if (rules && rules[0]) {
    const ruleId = rules[0].id;
    const { data: tasks } = await supabase.from('tasks').select('*').contains('linked_rule_ids', [ruleId]);
    console.log('关联任务:', JSON.stringify(tasks, null, 2));
  }
  
  // 查询所有任务
  const { data: allTasks } = await supabase.from('tasks').select('*').order('created_at', {ascending: false});
  console.log('\n所有任务:');
  console.log(JSON.stringify((allTasks || []).map(t => ({id: t.id, title: t.title, status: t.status, type: t.task_type, linked_rule_ids: t.linked_rule_ids})), null, 2));
  
  // 查询4/8-10的交易
  const { data: txns } = await supabase.from('transactions').select('*, rules(name)').gte('created_at', '2026-04-08T00:00:00').lte('created_at', '2026-04-10T23:59:59').order('created_at');
  console.log('\n4/8-10交易:');
  console.log(JSON.stringify((txns || []).map(t => ({date: t.created_at, rule: t.rules?.name, note: t.note})), null, 2));
}

main().catch(console.error);
