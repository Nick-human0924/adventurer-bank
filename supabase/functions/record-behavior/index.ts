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
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        child_id: child.id,
        rule_id: rule.id,
        points: rule.points,
        type: 'earn',
        note: message.substring(0, 100)
      })

    if (insertError) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `❌ 记录失败：${insertError.message}` 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
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
