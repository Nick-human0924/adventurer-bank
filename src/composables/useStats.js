// src/composables/useStats.js
import { ref, computed } from 'vue'
import { supabase } from '../utils/supabase.js'

export function useStats(childId) {
  const trendData = ref(null)
  const categoryData = ref(null)
  const heatmapData = ref(null)
  const loading = ref(false)
  const error = ref(null)

  // 获取积分趋势
  async function fetchTrend(days = 30) {
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .select(`
          created_at,
          amount,
          currency
        `)
        .eq('child_id', childId)
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
      
      if (err) throw err
      
      // 按日期汇总
      const dailyData = {}
      data.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
        if (!dailyData[date]) {
          dailyData[date] = { coins: 0, gems: 0 }
        }
        if (t.currency === 'coins') {
          dailyData[date].coins += t.amount
        } else {
          dailyData[date].gems += t.amount
        }
      })
      
      // 计算累计值
      let runningCoins = 0, runningGems = 0
      const labels = []
      const coinsData = []
      const gemsData = []
      
      Object.entries(dailyData).forEach(([date, values]) => {
        runningCoins += values.coins
        runningGems += values.gems
        labels.push(date)
        coinsData.push(runningCoins)
        gemsData.push(runningGems)
      })
      
      trendData.value = { labels, coins: coinsData, gems: gemsData }
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // 获取分类统计
  async function fetchCategories() {
    loading.value = true
    try {
      const { data, error: err } = await supabase
        .from('transactions')
        .select(`
          amount,
          rules!inner(category)
        `)
        .eq('child_id', childId)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())
      
      if (err) throw err
      
      const categories = {}
      data.forEach(t => {
        const cat = t.rules?.category || '其他'
        categories[cat] = (categories[cat] || 0) + t.amount
      })
      
      categoryData.value = categories
    } catch (err) {
      error.value = err.message
    } finally {
      loading.value = false
    }
  }

  // 获取热力图数据
  async function fetchHeatmap(months = 3) {
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setMonth(startDate.getMonth() - months)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .select('created_at, amount')
        .eq('child_id', childId)
        .gte('created_at', startDate.toISOString())
      
      if (err) throw err
      
      const dailyScores = {}
      data.forEach(t => {
        const date = new Date(t.created_at).toISOString().split('T')[0]
        dailyScores[date] = (dailyScores[date] || 0) + t.amount
      })
      
      heatmapData.value = dailyScores
    } catch (err) {
      error.value = err.message
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
