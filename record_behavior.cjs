const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://agkemugaxhrsnbyiluw.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo');

async function process() {
  // 1. 查找孩子
  const { data: children, error: childError } = await supabase
    .from('children')
    .select('*')
    .ilike('name', '%安哲%')
    .limit(1);
  
  if (childError || !children || children.length === 0) {
    console.log('❌ 未找到孩子');
    return;
  }
  
  const child = children[0];
  
  // 2. 匹配规则
  const { data: rules, error: ruleError } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true);
  
  // 找包含 abc 或 reading 的规则
  const rule = rules.find(r => 
    r.name.toLowerCase().includes('abc') || 
    r.name.toLowerCase().includes('reading')
  );
  
  if (!rule) {
    console.log('🤔 未找到abc reading相关规则');
    console.log('现有规则:', rules.map(r => r.name).join('、'));
    return;
  }
  
  // 3. 记录交易
  const { error: insertError } = await supabase
    .from('transactions')
    .insert([{
      child_id: child.id,
      rule_id: rule.id,
      points: rule.points,
      type: 'earn',
      note: '阅读abc reading一本'
    }]);
  
  if (insertError) {
    console.log('❌ 记录失败:', insertError.message);
    return;
  }
  
  // 4. 更新积分
  const newBalance = child.current_balance + rule.points;
  const newTotal = child.total_points + rule.points;
  
  await supabase
    .from('children')
    .update({
      current_balance: newBalance,
      total_points: newTotal
    })
    .eq('id', child.id);
  
  // 5. 输出结果
  console.log('✅ 已记录！');
  console.log('👶', child.name);
  console.log('📝', rule.name);
  console.log('💎 +', rule.points, '分');
  console.log('💰 当前积分：', newBalance, '分');
}

process();
