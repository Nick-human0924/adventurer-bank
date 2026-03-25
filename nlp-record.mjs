// 行为银行 - 自然语言录入（可直接调用版）
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

// 家长白名单
const PARENT_ACCOUNTS = [
  'ou_bec0f1afbf17f502b7292517eafcb69a', // 申慷尼
  'ou_e6db9bbf22475eab13de8fc23173a3ce'  // 黄睿
]

// 孩子配置
const CHILDREN_CONFIG = {
  'andrew': {
    name: '申安哲',
    aliases: ['安哲', 'andrew', '申安哲', 'Andrew', 'ANDREW', '安德鲁', '儿子']
  }
}

// 关键词到规则的智能映射
const KEYWORD_MAP = {
  'abc reading': '读英语（ABC reading 或者其他）',
  'abc': '读英语（ABC reading 或者其他）',
  '英语': '读英语（ABC reading 或者其他）',
  '读书': '自己读书',
  '收拾': '主动收拾',
  '家务': '帮助做家务',
  '围棋': '练习围棋',
  '钢琴': '钢琴练习',
  '数学': '数学练习',
  '早起': '早起套餐',
  '起床': '早起套餐',
  '夸奖': '得到夸奖',
  '表扬': '得到夸奖',
  '得到表扬': '得到夸奖',
  '被表扬': '得到夸奖',
  '足球': '踢足球',
  '羽毛球': '羽毛球',
  '游泳': '游泳',
  '跳绳': '跳绳',
  '跑步': '跑步',
  '发脾气': '乱发脾气',
  '打人': '打人不道歉',
  '离席': '吃饭离席',
  '趴地上': '趴在地上/跪在地上',
  '跪地上': '趴在地上/跪在地上',
  '未经允许拿': '未经允许拿东西',
  '说不好听': '说不好听的话'
}

// 识别孩子
function identifyChild(message) {
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

// 主函数：记录行为
export async function recordBehavior(message, accountId) {
  try {
    // 1. 验证家长身份
    if (!PARENT_ACCOUNTS.includes(accountId)) {
      return {
        success: false,
        message: '⚠️ 抱歉，只有家长可以使用此功能'
      }
    }

    // 2. 识别孩子
    const childMatch = identifyChild(message)
    if (!childMatch) {
      return {
        success: false,
        message: '❓ 未能识别孩子，请使用"申安哲"、"安哲"、"Andrew"或"安德鲁"'
      }
    }

    // 3. 获取孩子信息
    const { data: children, error: childError } = await supabase
      .from('children')
      .select('*')
      .eq('name', childMatch.name)
      .limit(1)

    if (childError || !children || children.length === 0) {
      return {
        success: false,
        message: `❌ 未找到孩子"${childMatch.name}"的信息`
      }
    }

    const child = children[0]

    // 4. 获取规则列表
    const { data: rules, error: rulesError } = await supabase
      .from('rules')
      .select('*')
      .eq('is_active', true)

    if (rulesError || !rules) {
      return {
        success: false,
        message: '❌ 无法获取规则列表'
      }
    }

    // 5. 智能匹配规则
    const lowerMsg = message.toLowerCase()
    let matchedRule = null
    let matchedKeyword = null
    
    // 先检查关键词映射
    for (const [keyword, ruleName] of Object.entries(KEYWORD_MAP)) {
      if (lowerMsg.includes(keyword.toLowerCase())) {
        matchedRule = rules.find(r => r.name.includes(ruleName))
        if (matchedRule) {
          matchedKeyword = keyword
          break
        }
      }
    }
    
    // 再检查完整规则名匹配
    if (!matchedRule) {
      for (const rule of rules) {
        if (lowerMsg.includes(rule.name.toLowerCase())) {
          matchedRule = rule
          break
        }
      }
    }

    if (!matchedRule) {
      const rulesList = rules.map(r => `• ${r.name}(${r.points > 0 ? '+' : ''}${r.points}分)`).join('\n')
      return {
        success: false,
        message: `🤔 未找到匹配的行为规则\n\n您的描述："${message}"\n\n可用规则：\n${rulesList}\n\n💡 请使用上述规则名称，或前往系统配置添加新规则`
      }
    }

    // 6. 记录交易
    const { error: insertError } = await supabase
      .from('transactions')
      .insert({
        child_id: child.id,
        rule_id: matchedRule.id,
        points: matchedRule.points,
        type: 'earn',
        note: message.substring(0, 100)
      })

    if (insertError) {
      return {
        success: false,
        message: `❌ 记录失败：${insertError.message}`
      }
    }

    // 7. 更新孩子积分
    const newBalance = (child.current_balance || 0) + matchedRule.points
    const newTotal = (child.total_points || 0) + matchedRule.points

    await supabase
      .from('children')
      .update({
        current_balance: newBalance,
        total_points: newTotal
      })
      .eq('id', child.id)

    // 8. 返回成功
    return {
      success: true,
      message: `✅ 已记录！\n\n👶 ${child.name}\n📝 ${matchedRule.name}\n💎 ${matchedRule.points > 0 ? '+' : ''}${matchedRule.points}分\n💰 当前积分：${newBalance}分`,
      data: {
        childName: child.name,
        ruleName: matchedRule.name,
        points: matchedRule.points,
        currentBalance: newBalance,
        matchedKeyword: matchedKeyword
      }
    }

  } catch (error) {
    return {
      success: false,
      message: `❌ 系统错误：${error.message}`
    }
  }
}

// 获取规则列表
export async function getRules() {
  const { data: rules, error } = await supabase
    .from('rules')
    .select('*')
    .eq('is_active', true)
    .order('points', { ascending: false })
  
  if (error) {
    return { success: false, message: error.message }
  }
  
  return {
    success: true,
    rules: rules.map(r => ({
      name: r.name,
      points: r.points,
      description: r.description
    }))
  }
}

// 测试
if (import.meta.main) {
  const testMessage = process.argv[2] || '安哲按时起床'
  const testAccount = 'ou_bec0f1afbf17f502b7292517eafcb69a'
  
  console.log('📝 测试消息:', testMessage)
  const result = await recordBehavior(testMessage, testAccount)
  console.log(result.message)
}
