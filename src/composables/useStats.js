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
  async function fetchCategories() {
    const id = currentChildId.value
    if (!id) {
      console.warn('useStats: childId is empty')
      return
    }
    
    loading.value = true
    try {
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
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
      if (err) throw err
      
      // 如果没有规则关联，基于 note 关键词简单分类
      const categories = {}
      data.forEach(t => {
        const note = t.note || ''
        let category = '其他'
        
        if (note.includes('作业') || note.includes('学习')) category = '学习成长'
        else if (note.includes('运动') || note.includes('体育')) category = '运动健康'
        else if (note.includes('整理') || note.includes('打扫') || note.includes('家务')) category = '生活自理'
        else if (note.includes('画') || note.includes('音乐') || note.includes('艺术')) category = '艺术创造'
        else if (note.includes('帮助') || note.includes('分享') || note.includes('礼貌')) category = '品德社交'
        else if (note.includes('早起') || note.includes('睡觉') || note.includes('作息')) category = '作息规律'
        else if (note.includes('吃') || note.includes('蔬菜') || note.includes('水果')) category = '健康饮食'
        
        categories[category] = (categories[category] || 0) + (t.points || 0)
      })
      
      categoryData.value = categories
      console.log('✅ fetchCategories:', categories)
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
