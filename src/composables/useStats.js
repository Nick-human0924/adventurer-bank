// src/composables/useStats.js
import { ref, computed, unref } from 'vue'
import { supabase } from '../utils/supabase.js'

export function useStats(childId) {
  const trendData = ref(null)
  const categoryData = ref(null)
  const heatmapData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  // 获取当前 childId 值（支持 ref 或普通值）
  const currentChildId = computed(() => unref(childId))

  // 获取积分趋势
  async function fetchTrend(days = 30) {
    const id = currentChildId.value
    if (!id) {
      console.warn('useStats: childId is empty')
      return
    }
    
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .select(`
          created_at,
          points,
          type
        `)
        .eq('child_id', id)
        .eq('type', 'earn')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (err) throw err
      
      // 按日期汇总（使用 points 字段）
      const dailyData = {}
      data.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        if (!dailyData[date]) {
          dailyData[date] = 0
        }
        dailyData[date] += t.points || 0
      })
      
      // 计算累计值
      let runningTotal = 0
      const labels = []
      const pointsData = []
      
      Object.entries(dailyData).forEach(([date, points]) => {
        runningTotal += points
        labels.push(date)
        pointsData.push(runningTotal)
      })
      
      trendData.value = { labels, data: pointsData }
      console.log('✅ fetchTrend: 加载了', data.length, '条记录')
    } catch (err) {
      error.value = err.message
      console.error('❌ useStats fetchTrend error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取分类统计
  async function fetchCategories(days = 30) {
    const id = currentChildId.value
    if (!id) {
      console.warn('useStats: childId is empty')
      return
    }
    
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      // 使用现有的 transactions 表数据，通过 note 或 rule_id 推断分类
      const { data, error: err } = await supabase
        .from('transactions')
        .select(`
          points,
          note,
          rule_id
        `)
        .eq('child_id', id)
        .eq('type', 'earn')
        .gte('created_at', startDate.toISOString())
      
      if (err) throw err
      
      // 如果没有规则关联，基于 note 关键词简单分类 - 与规则管理保持一致
      const categories = {}
      data.forEach(t => {
        const note = (t.note || '').toLowerCase()
        let category = '其他'
        
        // 运动健康
        if (note.includes('运动') || note.includes('锻炼') || note.includes('球') || note.includes('跑步')) category = '运动健康'
        else if (note.includes('游泳') || note.includes('骑车') || note.includes('跳绳') || note.includes('体操')) category = '运动健康'
        else if (note.includes('体育') || note.includes('健身') || note.includes('户外') || note.includes('瑜伽')) category = '运动健康'
        // 学习成长
        else if (note.includes('作业') || note.includes('阅读') || note.includes('学习') || note.includes('写字')) category = '学习成长'
        else if (note.includes('数学') || note.includes('英语') || note.includes('画画') || note.includes('科学')) category = '学习成长'
        else if (note.includes('英文') || note.includes('abc') || note.includes('reading') || note.includes('拼音')) category = '学习成长'
        else if (note.includes('语文') || note.includes('识字') || note.includes('看书') || note.includes('练习')) category = '学习成长'
        else if (note.includes('算术') || note.includes('计算') || note.includes('math') || note.includes('地理')) category = '学习成长'
        // 生活自理 - 包含"自己"关键词
        else if (note.includes('整理') || note.includes('家务') || note.includes('起床') || note.includes('睡觉')) category = '生活自理'
        else if (note.includes('刷牙') || note.includes('洗澡') || note.includes('穿衣') || note.includes('书包')) category = '生活自理'
        else if (note.includes('打扫') || note.includes('房间') || note.includes('叠被') || note.includes('洗漱')) category = '生活自理'
        else if (note.includes('收拾') || note.includes('清洁') || note.includes('洗碗') || note.includes('自己')) category = '生活自理'
        // 艺术创造
        else if (note.includes('钢琴') || note.includes('吉他') || note.includes('唱歌') || note.includes('跳舞')) category = '艺术创造'
        else if (note.includes('音乐') || note.includes('拍照') || note.includes('表演') || note.includes('手工')) category = '艺术创造'
        else if (note.includes('画') || note.includes('艺术') || note.includes('创作') || note.includes('摄影')) category = '艺术创造'
        // 品德社交
        else if (note.includes('帮助') || note.includes('分享') || note.includes('礼貌') || note.includes('感谢')) category = '品德社交'
        else if (note.includes('问好') || note.includes('友善') || note.includes('助人') || note.includes('合作')) category = '品德社交'
        else if (note.includes('夸奖') || note.includes('表扬') || note.includes('赞美') || note.includes('鼓励')) category = '品德社交'
        else if (note.includes('好人') || note.includes('善事') || note.includes('孝敬') || note.includes('尊重')) category = '品德社交'
        // 作息规律
        else if (note.includes('按时') || note.includes('早睡') || note.includes('午睡') || note.includes('作息')) category = '作息规律'
        else if (note.includes('早起') || note.includes('准时') || note.includes('闹钟')) category = '作息规律'
        // 健康饮食
        else if (note.includes('水果') || note.includes('蔬菜') || note.includes('牛奶') || note.includes('喝水')) category = '健康饮食'
        else if (note.includes('吃饭') || note.includes('健康') || note.includes('饮食') || note.includes('营养')) category = '健康饮食'
        
        categories[category] = (categories[category] || 0) + (t.points || 0)
      })
      
      categoryData.value = categories
      console.log('✅ fetchCategories:', categories, 'days:', days)
    } catch (err) {
      error.value = err.message
      console.error('❌ useStats fetchCategories error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取热力图数据
  async function fetchHeatmap(months = 3) {
    const id = currentChildId.value
    if (!id) {
      console.warn('useStats: childId is empty')
      return
    }
    
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .select('created_at, points')
        .eq('child_id', id)
        .eq('type', 'earn')
        .gte('created_at', startDate.toISOString())
      
      if (err) throw err
      
      const dailyScores = {}
      data.forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0]
        dailyScores[date] = (dailyScores[date] || 0) + (t.points || 0)
      })
      
      heatmapData.value = dailyScores
      console.log('✅ fetchHeatmap: 加载了', Object.keys(dailyScores).length, '天的数据')
    } catch (err) {
      error.value = err.message
      console.error('❌ useStats fetchHeatmap error:', err)
    } finally {
      loading.value = false
    }
  }

  return {
    trendData,
    categoryData,
    heatmapData,
    loading,
    error,
    fetchTrend,
    fetchCategories,
    fetchHeatmap
  }
}
