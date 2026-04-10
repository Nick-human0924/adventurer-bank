// Supabase Edge Function: 行为记录处理器
// 部署路径: supabase/functions/record-behavior/index.ts

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// 孩子配置
const CHILDREN_CONFIG = {
  'andrew': {
    name: '申安哲',
    aliases: ['安哲', 'andrew', '申安哲', 'Andrew', 'ANDREW']
  }
}

// 家长白名单
const PARENT_ACCOUNTS = [
  'ou_bec0f1afbf17f502b7292517eafcb69a', // 申慷尼
  'ou_e6db9bbf22475eab13de8fc23173a3ce'  // 黄睿
]

Deno.serve(async (req) => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { message, accountId } = await req.json()

    // 1. 验证家长身份
    if (!PARENT_ACCOUNTS.includes(accountId)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '⚠️ 抱歉，只有家长可以使用此功能' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. 识别孩子
    const childMatch = identifyChild(message)
    if (!childMatch) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '❓ 未能识别孩子，请使用"申安哲"、"安哲"或"andrew"' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 创建Supabase客户端（使用service_role）
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )

    // 3. 从数据库获取孩子ID
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('*')
      .ilike('name', '%' + childMatch.name + '%')
      .limit(1)

    if (childError || !children || children.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `❌ 未找到孩子"${childMatch.name}"的信息` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const child = children[0]

    // 4. 匹配规则
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError || !rules) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: '❌ 无法获取规则列表' 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rule = matchRule(message, rules)

    if (!rule) {
      const rulesList = rules.map(r => r.name).join('、')
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `🤔 未找到匹配的行为规则\n\n您的描述："${message}"\n\n现有规则：${rulesList}\n\n💡 如需添加新规则，请前往系统配置`
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5. 记录交易
    const { data: txData, error: insertError } = await supabase
      .from('transactions')
      .insert({
        child_id: child.id,
        rule_id: rule.id,
        points: rule.points,
        type: 'earn',
        note: message.substring(0, 100)
      })
      .select('*')
      .single()

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `❌ 记录失败：${insertError.message}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 5.5 更新任务进度
    try {
      const today = new Date().toISOString().split('T')[0]
      await updateTaskProgress(supabase, child.id, rule.id, today)
    } catch (taskErr) {
      console.error('更新任务进度失败:', taskErr)
      // 不影响主流程，继续返回成功
    }

    // 6. 更新孩子积分
    const newBalance = (child.current_balance || 0) + rule.points
    const newTotal = (child.total_points || 0) + rule.points

    await supabase
      .from('children')
      .update({
        current_balance: newBalance,
        total_points: newTotal
      })
      .eq('id', child.id)

    // 7. 返回成功
    return new Response(
      JSON.stringify({
        success: true,
        message: `✅ 已记录！\n\n👶 ${child.name}\n📝 ${rule.name}\n💎 +${rule.points}分\n💰 当前积分：${newBalance}分`,
        data: {
          childName: child.name,
          ruleName: rule.name,
          points: rule.points,
          currentBalance: newBalance
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: `❌ 系统错误：${error.message}` 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

// 识别孩子
function identifyChild(message: string) {
  const lowerMessage = message.toLowerCase()
  
  for (const [id, config] of Object.entries(CHILDREN_CONFIG)) {
    for (const alias of config.aliases) {
      if (lowerMessage.includes(alias.toLowerCase())) {
        return { id, name: config.name }
      }
    }
  }
  
  return null
}

// 匹配规则
function matchRule(message: string, rules: any[]) {
  const lowerMessage = message.toLowerCase()
  
  for (const rule of rules) {
    const ruleName = rule.name.toLowerCase()
    const ruleDesc = (rule.description || '').toLowerCase()
    
    // 精确匹配规则名
    if (lowerMessage.includes(ruleName)) {
      return rule
    }
    
    // 关键词匹配
    const keywords = extractKeywords(ruleName + ' ' + ruleDesc)
    const matchCount = keywords.filter(kw => lowerMessage.includes(kw)).length
    
    if (matchCount >= 2) {
      return rule
    }
  }
  
  return null
}

// 提取关键词
function extractKeywords(text: string) {
  const stopWords = ['的', '了', '是', '在', '和', '今天', '昨天', '现在']
  return text
    .toLowerCase()
    .split(/\s+|，|。|！|？/)
    .filter(w => w.length >= 2 && !stopWords.includes(w))
}

// 更新任务进度
async function updateTaskProgress(supabase: any, childId: string, ruleId: string, date: string) {
  // 1. 查找关联此规则的所有活动任务
  const { data: tasks, error: taskError } = await supabase
    .from('tasks')
    .select(`
      *,
      task_progress!inner(id, current_count, streak_count, last_completed_date, status, combo_progress)
    `)
    .eq('status', 'active')
    .or(`task_type.eq.single,task_type.eq.continuous,task_type.eq.cumulative`)
  
  if (taskError) throw taskError
  
  // 2. 获取组合任务
  const { data: comboTasks, error: comboError } = await supabase
    .from('tasks')
    .select('*')
    .eq('status', 'active')
    .eq('task_type', 'combo')
    .filter('linked_rule_ids', 'cs', `{${ruleId}}`)
  
  if (comboError) throw comboError
  
  // 合并并过滤
  const { data: ruleData } = await supabase.from('rules').select('name, icon, icon_emoji').eq('id', ruleId).single()
  const ruleName = ruleData?.name || ''
  const ruleIcon = ruleData?.icon || ruleData?.icon_emoji || '✓'
  
  const allTasks = [
    ...(tasks || []).filter((t: any) => 
      !t.linked_rule_ids || t.linked_rule_ids.length === 0 || t.linked_rule_ids.includes(ruleId)
    ),
    ...(comboTasks || [])
  ]
  
  for (const task of allTasks) {
    if (task.cycle_end && task.cycle_end < date) continue
    
    // 获取或创建进度记录
    let { data: progress, error: progressError } = await supabase
      .from('task_progress')
      .select('*')
      .eq('task_id', task.id)
      .eq('child_id', childId)
      .single()
    
    if (progressError || !progress) {
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
        console.error('创建进度失败:', createError)
        continue
      }
      progress = newProgress
    }
    
    if (progress.status === 'completed') continue
    
    let isCompleted = false
    
    if (task.task_type === 'combo' && task.linked_rule_ids?.length > 0) {
      const comboProgress = { ...(progress.combo_progress || {}) }
      comboProgress[ruleId] = { completed: true, date, time: new Date().toISOString() }
      
      const allCompleted = task.linked_rule_ids.every((id: string) => comboProgress[id]?.completed)
      const newCount = (progress.current_count || 0) + 1
      
      await supabase.from('task_progress').update({
        combo_progress: comboProgress,
        current_count: newCount,
        last_completed_date: date,
        status: allCompleted ? 'completed' : 'active'
      }).eq('id', progress.id)
      
      isCompleted = allCompleted
    } else if (task.task_type === 'continuous') {
      const history = [...(progress.completion_history || [])]
      const alreadyRecorded = history.some((h: any) => h.date === date)
      
      if (!alreadyRecorded) {
        history.push({ date, rule_name: ruleName, rule_icon: ruleIcon, points: task.reward_points || rule.points })
        const streakCount = history.length
        const targetStreak = task.target_streak || 7
        
        await supabase.from('task_progress').update({
          completion_history: history,
          streak_count: streakCount,
          last_completed_date: date,
          status: streakCount >= targetStreak ? 'completed' : 'active'
        }).eq('id', progress.id)
        
        isCompleted = streakCount >= targetStreak
      }
    } else if (task.task_type === 'cumulative' || task.task_type === 'single') {
      const newCount = (progress.current_count || 0) + 1
      const targetCount = task.target_count || (task.task_type === 'single' ? 1 : 5)
      
      await supabase.from('task_progress').update({
        current_count: newCount,
        last_completed_date: date,
        status: newCount >= targetCount ? 'completed' : 'active'
      }).eq('id', progress.id)
      
      isCompleted = newCount >= targetCount
    }
    
    if (isCompleted) {
      await supabase.from('tasks').update({ status: 'completed' }).eq('id', task.id)
    }
  }
}
