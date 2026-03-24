// 优化版 loadChildren - 减少查询次数
async function loadChildren() {
  console.log('🚀 开始加载孩子数据...')
  const startTime = Date.now()

  try {
    // 方法1：使用数据库视图或函数（推荐）
    // 或者直接查询 children，不查询 transactions（前端不显示详细交易）
    
    const { data, error } = await supabase
      .from('children')
      .select(`
        *,
        transactions:transactions(points, type)
      `)
      .order('total_points', { ascending: false })

    if (error) {
      console.error('加载孩子失败:', error)
      showMessage('error', '加载失败，请刷新重试')
      return
    }

    // 简化计算 - 直接用数据库的 current_balance 和 total_points
    // 不实时计算 transactions
    const childrenWithBalance = (data || []).map(child => {
      // 如果有嵌套 transactions 数据，简单计算
      let earned = child.total_points || 0
      let spent = 0
      
      if (child.transactions && Array.isArray(child.transactions)) {
        child.transactions.forEach(tx => {
          if (tx.type === 'earn') earned += tx.points
          else spent += tx.points
        })
      }

      return {
        ...child,
        current_balance: earned - spent,
        total_points: earned
      }
    })

    children.value = childrenWithBalance
    console.log(`✅ 加载完成，耗时 ${Date.now() - startTime}ms`)

  } catch (err) {
    console.error('加载异常:', err)
    showMessage('error', '加载异常，请检查网络')
  }
}

// 备选方案：超简单版本（不查询 transactions）
async function loadChildrenSimple() {
  const { data, error } = await supabase
    .from('children')
    .select('*')
    .order('total_points', { ascending: false })

  if (error) {
    console.error('加载失败:', error)
    return
  }

  // 直接用数据库字段，不计算
  children.value = (data || []).map(child => ({
    ...child,
    current_balance: child.current_balance || 0,
    total_points: child.total_points || 0
  }))
}