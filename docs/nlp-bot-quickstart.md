# 自然语言录入机器人 - 快速启动指南

## 配置步骤

### 1. 创建飞书机器人
- 登录飞书开放平台
- 创建企业自建应用
- 开启机器人功能
- 获取 `App ID` 和 `App Secret`

### 2. 配置环境变量
```bash
# Supabase 配置（已提供）
SUPABASE_URL=https://agkemugaxhrsnbyiluw.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheGhyc25ieWlsdxQiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTc0MjY1NjIzNiwiZXhwIjoyMDU4MjMyMjM2fQ.zaNjK9GnlhmAGTZfA1iLs6DIzNhg6tZ7Cq7SQqN6WFM

# 飞书配置
FEISHU_APP_ID=cli_xxx
FEISHU_APP_SECRET=xxx
```

### 3. 核心代码模板

```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

// 孩子称呼映射
const CHILD_ALIASES = {
  '儿子': '申安哲',
  '安哲': '申安哲',
  '申安哲': '申安哲',
  'andrew': '申安哲'
}

// 行为关键词映射
const BEHAVIOR_MAP = [
  { keywords: ['起床', '醒了', '早起'], rule: '按时起床', points: 5 },
  { keywords: ['作业', '写完', '做好'], rule: '完成作业', points: 10 },
  { keywords: ['整理', '收拾', '打扫', '房间'], rule: '整理房间', points: 5 },
  { keywords: ['读书', '看书', '阅读', 'abc'], rule: '阅读abc reading', points: 5 },
  { keywords: ['刷牙', '洗脸'], rule: '自己刷牙', points: 3 },
  { keywords: ['帮忙', '家务', '协助'], rule: '帮忙做家务', points: 5 }
]

// 解析消息
async function parseMessage(text) {
  // 1. 识别孩子
  let childName = null
  for (const [alias, name] of Object.entries(CHILD_ALIASES)) {
    if (text.toLowerCase().includes(alias.toLowerCase())) {
      childName = name
      break
    }
  }
  
  // 2. 识别行为
  let behavior = null
  for (const item of BEHAVIOR_MAP) {
    if (item.keywords.some(k => text.includes(k))) {
      behavior = item
      break
    }
  }
  
  // 3. 识别时间
  let date = new Date()
  if (text.includes('昨天')) date.setDate(date.getDate() - 1)
  if (text.includes('前天')) date.setDate(date.getDate() - 2)
  
  return { childName, behavior, date }
}

// 记录行为
async function recordBehavior(childName, behavior, date) {
  // 获取用户
  const { data: { user } } = await supabase.auth.getUser()
  
  // 查询孩子ID
  const { data: child } = await supabase
    .from('children')
    .select('id, current_balance')
    .eq('name', childName)
    .single()
  
  // 查询规则ID
  const { data: rule } = await supabase
    .from('rules')
    .select('id')
    .eq('name', behavior.rule)
    .single()
  
  // 插入交易记录
  await supabase.from('transactions').insert({
    child_id: child.id,
    points: behavior.points,
    type: 'earn',
    note: behavior.rule,
    rule_id: rule.id,
    created_at: date.toISOString()
  })
  
  // 更新余额
  await supabase
    .from('children')
    .update({ current_balance: child.current_balance + behavior.points })
    .eq('id', child.id)
  
  return {
    childName,
    behavior: behavior.rule,
    points: behavior.points,
    newBalance: child.current_balance + behavior.points
  }
}

// 主处理函数
export default async function handleMessage(text) {
  const parsed = await parseMessage(text)
  
  if (!parsed.childName) {
    return '抱歉，我没有找到孩子的信息。请使用"儿子"、"安哲"或"申安哲"。'
  }
  
  if (!parsed.behavior) {
    return '抱歉，我没有识别到具体行为。请描述如"读书"、"完成作业"等。'
  }
  
  const result = await recordBehavior(
    parsed.childName,
    parsed.behavior,
    parsed.date
  )
  
  return `✅ 已记录：${result.childName} ${result.behavior} +${result.points}金币\n当前余额：💰 ${result.newBalance}金币`
}
```

### 4. 飞书消息处理
```javascript
// 飞书 webhook 处理
app.post('/webhook', async (req, res) => {
  const { message } = req.body
  
  if (message.message_type === 'text') {
    const text = message.content.text
    const reply = await handleMessage(text)
    
    // 回复用户
    await sendFeishuMessage(message.chat_id, reply)
  }
  
  res.json({ code: 0 })
})
```

---

## 测试指令

部署后，在飞书测试以下消息：

1. `今天儿子读书了`
2. `andrew按时起床`
3. `昨天安哲完成了作业`
4. `申安哲整理了房间`

---

## 查看结果

记录成功后，访问：https://nick-human0924.github.io/adventurer-bank/

在"最近行为记录"中可以看到新记录的数据。

---

## 扩展开发

如需添加新行为规则：

1. 在网页端"行为规则"中添加新规则
2. 在 `BEHAVIOR_MAP` 中添加关键词映射
3. 重新部署机器人

---

## 技术支持

- 数据库: Supabase
- 前端: https://nick-human0924.github.io/adventurer-bank/
- 源码: /root/.openclaw/workspace/kids-behavior-bank/
