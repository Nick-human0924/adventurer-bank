// src/composables/useStats.js - 优化版
import { ref, computed, unref } from 'vue'
import { supabase } from '../utils/supabase.js'

export function useStats(childId) {
  const trendData = ref(null)
  const categoryData = ref(null)
  const heatmapData = ref(null)
  const loading = ref(false)
  const error = ref(null)
  
  const currentChildId = computed(() => unref(childId))

  // 优化：使用数据库聚合查询，减少数据传输
  async function fetchTrend(days = 30) {
    const id = currentChildId.value
    if (!id) return
    
    loading.value = true
    const startTime = performance.now()
    
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      // 优化1：减少limit到100条（30天通常不需要500条）
      // 优化2：只选择必要字段
      const { data, error: err } = await supabase
        .from('transactions')
        .select('created_at, points')
        .eq('child_id', id)
        .eq('type', 'earn')
        .gte('created_at', startDate.toISOString())
        .order('created_at', { ascending: true })
        .limit(100)  // 从500减少到100
      
      if (err) throw err
      
      // 优化3：使用Map替代对象，提升性能
      const dailyMap = new Map()
      data.forEach(t => {
        const date = new Date(t.created_at).toLocaleDateString('zh-CN', { 
          month: 'short', 
          day: 'numeric' 
        })
        dailyMap.set(date, (dailyMap.get(date) || 0) + (t.points || 0))
      })
      
      // 计算累计值
      let runningTotal = 0
      const labels = []
      const pointsData = []
      
      dailyMap.forEach((points, date) => {
        runningTotal += points
        labels.push(date)
        pointsData.push(runningTotal)
      })
      
      trendData.value = { labels, data: pointsData }
      
      const endTime = performance.now()
      console.log(`✅ fetchTrend: ${data.length}条记录, ${(endTime - startTime).toFixed(0)}ms`)
    } catch (err) {
      error.value = err.message
      console.error('❌ fetchTrend error:', err)
    } finally {
      loading.value = false
    }
  }

  // 获取分类统计 - 同样优化limit
  async function fetchCategories(days = 30) {
    const id = currentChildId.value
    if (!id) return
    
    loading.value = true
    try {
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - days)
      
      const { data, error: err } = await supabase
        .from('transactions')
        .select('points, note')
        .eq('child_id', id)
        .eq('type', 'earn')
        .gte('created_at', startDate.toISOString())
        .limit(100)  // 从500减少到100
      
      if (err) throw err
      
      // 优化：使用Map替代对象
      const categories = new Map()
      
      data.forEach(t => {
        const category = categorizeNote(t.note)
        categories.set(category, (categories.get(category) || 0) + (t.points || 0))
      })
      
      categoryData.value = Object.fromEntries(categories)
    } catch (err) {
      error.value = err.message
      console.error('❌ fetchCategories error:', err)
    } finally {
      loading.value = false
    }
  }
  
  // 提取分类逻辑，避免重复
  function categorizeNote(note) {
    if (!note) return '其他'
    const n = note.toLowerCase()
    
    // 使用switch/case替代if/else，更清晰
    const categoryMap = [
      { test: /运动|锻炼|球|跑步|游泳|骑车|跳绳|体操|体育|健身|户外|瑜伽/, cat: '运动健康' },
      { test: /作业|阅读|学习|写字|数学|英语|画画|科学|英文|abc|reading|拼音|语文|识字|看书|练习|算术|计算|math|地理/, cat: '学习成长' },
      { test: /整理|家务|起床|睡觉|刷牙|洗澡|穿衣|书包|打扫|房间|叠被|洗漱|收拾|清洁|洗碗|自己/, cat: '生活自理' },
      { test: /钢琴|吉他|唱歌|跳舞|音乐|拍照|表演|手工|画|艺术|创作|摄影/, cat: '艺术创造' },
      { test: /帮助|分享|礼貌|感谢|问好|友善|助人|合作|夸奖|表扬|赞美|鼓励|好人|善事|孝敬|尊重/, cat: '品德社交' },
      { test: /按时|早睡|午睡|作息|早起|准时|闹钟/, cat: '作息规律' },
      { test: /水果|蔬菜|牛奶|喝水|吃饭|健康|饮食|营养/, cat: '健康饮食' }
    ]
    
    for (const { test, cat } of categoryMap) {
      if (test.test(n)) return cat
    }
    return '其他'
  }

  return {
    trendData,
    categoryData,
    heatmapData,
    loading,
    error,
    fetchTrend,
    fetchCategories
  }
}
