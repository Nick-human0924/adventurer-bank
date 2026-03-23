// Vercel Serverless Function - 行为记录API
// 部署后访问: https://your-app.vercel.app/api/record

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false, 
      message: '只支持POST请求' 
    })
  }

  try {
    const { message, accountId, childName, behavior, points } = req.body

    // 家长白名单验证
    const PARENT_ACCOUNTS = [
      'ou_bec0f1afbf17f502b7292517eafcb69a', // 申慷尼
      'ou_e6db9bbf22475eab13de8fc23173a3ce'  // 黄睿
    ]

    if (!PARENT_ACCOUNTS.includes(accountId)) {
      return res.status(403).json({
        success: false,
        message: '⚠️ 抱歉，只有家长可以使用此功能'
      })
    }

    // 获取环境变量
    const SUPABASE_URL = process.env.SUPABASE_URL
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

    if (!SUPABASE_URL || !SUPABASE_KEY) {
      return res.status(500).json({
        success: false,
        message: '❌ 服务器配置错误：缺少Supabase配置'
      })
    }

    // 准备数据
    const recordData = {
      child_id: childName || 'andrew',
      rule_id: behavior || 'manual',
      points: points || 5,
      type: 'earn',
      note: message?.substring(0, 200) || '',
      created_at: new Date().toISOString()
    }

    // 调用Supabase REST API
    const response = await fetch(`${SUPABASE_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(recordData)
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('Supabase错误:', errorText)
      return res.status(500).json({
        success: false,
        message: `❌ Supabase写入失败: ${response.status}`,
        error: errorText
      })
    }

    // 更新孩子积分
    await updateChildBalance(SUPABASE_URL, SUPABASE_KEY, recordData.child_id, recordData.points)

    return res.status(200).json({
      success: true,
      message: `✅ 已记录！\n👶 ${childName || '安哲'}\n📝 ${behavior || '行为'}\n💎 +${points || 5}分`,
      data: recordData
    })

  } catch (error) {
    console.error('API错误:', error)
    return res.status(500).json({
      success: false,
      message: `❌ 系统错误: ${error.message}`
    })
  }
}

// 更新孩子余额
async function updateChildBalance(supabaseUrl, supabaseKey, childId, points) {
  try {
    // 先查询当前余额
    const getResponse = await fetch(
      `${supabaseUrl}/rest/v1/children?id=eq.${childId}&select=current_balance,total_points`,
      {
        headers: {
          'apikey': supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`
        }
      }
    )

    if (!getResponse.ok) return

    const children = await getResponse.json()
    if (!children || children.length === 0) return

    const child = children[0]
    const newBalance = (child.current_balance || 0) + points
    const newTotal = (child.total_points || 0) + points

    // 更新余额
    await fetch(`${supabaseUrl}/rest/v1/children?id=eq.${childId}`, {
      method: 'PATCH',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        current_balance: newBalance,
        total_points: newTotal
      })
    })
  } catch (error) {
    console.error('更新余额失败:', error)
  }
}
