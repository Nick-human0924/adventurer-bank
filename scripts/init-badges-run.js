import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const badgesData = [
  // 里程碑徽章（10个）
  { code: 'novice_100', name: '初出茅庐', icon: '🌱', description: '累计获得100积分', category: 'milestone', tier: 'bronze', unlock_condition: {type: 'total_points', min: 100} },
  { code: 'advanced_500', name: '小有所成', icon: '🌿', description: '累计获得500积分', category: 'milestone', tier: 'silver', unlock_condition: {type: 'total_points', min: 500} },
  { code: 'expert_1000', name: '积少成多', icon: '🌳', description: '累计获得1000积分', category: 'milestone', tier: 'gold', unlock_condition: {type: 'total_points', min: 1000} },
  { code: 'master_5000', name: '富豪榜', icon: '👑', description: '累计获得5000积分', category: 'milestone', tier: 'diamond', unlock_condition: {type: 'total_points', min: 5000} },
  { code: 'week_1', name: '一周新人', icon: '🐣', description: '使用系统满7天', category: 'milestone', tier: 'bronze', unlock_condition: {type: 'days_active', min: 7} },
  { code: 'month_1', name: '月度达人', icon: '🐥', description: '使用系统满30天', category: 'milestone', tier: 'silver', unlock_condition: {type: 'days_active', min: 30} },
  { code: 'quarter_1', name: '季度明星', icon: '🦅', description: '使用系统满90天', category: 'milestone', tier: 'gold', unlock_condition: {type: 'days_active', min: 90} },
  { code: 'year_1', name: '年度传奇', icon: '🐉', description: '使用系统满365天', category: 'milestone', tier: 'diamond', unlock_condition: {type: 'days_active', min: 365} },
  { code: 'first_redeem', name: '首次兑换', icon: '🛒', description: '第一次兑换奖品', category: 'milestone', tier: 'bronze', unlock_condition: {type: 'redeem_count', min: 1} },
  { code: 'redeem_10', name: '购物狂', icon: '🎁', description: '累计兑换10次奖品', category: 'milestone', tier: 'silver', unlock_condition: {type: 'redeem_count', min: 10} },
  
  // 连续徽章（5个）
  { code: 'streak_3', name: '3天连胜', icon: '🔥', description: '连续3天有加分记录', category: 'streak', tier: 'bronze', unlock_condition: {type: 'streak_days', min: 3} },
  { code: 'streak_7', name: '7天连胜', icon: '🔥🔥', description: '连续7天有加分记录', category: 'streak', tier: 'silver', unlock_condition: {type: 'streak_days', min: 7} },
  { code: 'streak_14', name: '14天连胜', icon: '🔥🔥🔥', description: '连续14天有加分记录', category: 'streak', tier: 'gold', unlock_condition: {type: 'streak_days', min: 14} },
  { code: 'streak_30', name: '30天连胜', icon: '💫', description: '连续30天有加分记录', category: 'streak', tier: 'diamond', unlock_condition: {type: 'streak_days', min: 30} },
  { code: 'full_month', name: '全勤宝宝', icon: '⭐', description: '一个月每天都活跃', category: 'streak', tier: 'gold', unlock_condition: {type: 'full_month', min: 1} },
  
  // 分类徽章（16个 = 8分类 × 2等级）
  { code: 'sports_bronze', name: '运动新星', icon: '🏃', description: '运动健康类获得50分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '运动健康', min: 50} },
  { code: 'sports_gold', name: '运动健将', icon: '🏆', description: '运动健康类获得200分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '运动健康', min: 200} },
  { code: 'study_bronze', name: '小学霸', icon: '📚', description: '学习成长类获得50分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '学习成长', min: 50} },
  { code: 'study_gold', name: '大学霸', icon: '🎓', description: '学习成长类获得200分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '学习成长', min: 200} },
  { code: 'life_bronze', name: '小帮手', icon: '🧹', description: '生活自理类获得30分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '生活自理', min: 30} },
  { code: 'life_gold', name: '家务达人', icon: '🏠', description: '生活自理类获得100分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '生活自理', min: 100} },
  { code: 'art_bronze', name: '小艺术家', icon: '🎨', description: '艺术创造类获得30分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '艺术创造', min: 30} },
  { code: 'art_gold', name: '艺术大师', icon: '🎭', description: '艺术创造类获得100分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '艺术创造', min: 100} },
  { code: 'moral_bronze', name: '暖心宝贝', icon: '💝', description: '品德社交类获得30分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '品德社交', min: 30} },
  { code: 'moral_gold', name: '品德模范', icon: '🌟', description: '品德社交类获得100分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '品德社交', min: 100} },
  { code: 'routine_bronze', name: '按时宝宝', icon: '⏰', description: '作息规律类获得30分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '作息规律', min: 30} },
  { code: 'routine_gold', name: '作息大师', icon: '🌙', description: '作息规律类获得100分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '作息规律', min: 100} },
  { code: 'diet_bronze', name: '不挑食', icon: '🍎', description: '健康饮食类获得20分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '健康饮食', min: 20} },
  { code: 'diet_gold', name: '健康达人', icon: '🥗', description: '健康饮食类获得80分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '健康饮食', min: 80} },
  { code: 'other_bronze', name: '全面发展', icon: '⭐', description: '其他类获得20分', category: 'category', tier: 'bronze', unlock_condition: {type: 'category_points', category: '其他', min: 20} },
  { code: 'other_gold', name: '全能宝贝', icon: '💎', description: '其他类获得80分', category: 'category', tier: 'gold', unlock_condition: {type: 'category_points', category: '其他', min: 80} },
  
  // 特殊徽章（8个）
  { code: 'perfect_day', name: '完美一天', icon: '🌈', description: '单日获得5个不同规则的加分', category: 'special', tier: null, unlock_condition: {type: 'unique_rules_day', min: 5} },
  { code: 'comeback', name: '逆风翻盘', icon: '🚀', description: '单日从负分变为正分', category: 'special', tier: null, unlock_condition: {type: 'comeback', min: 1} },
  { code: 'early_bird', name: '早起鸟', icon: '🌅', description: '连续7天在8点前起床', category: 'special', tier: null, unlock_condition: {type: 'early_riser', min: 7} },
  { code: 'self_discipline', name: '自律达人', icon: '🎯', description: '连续完成同一任务14天', category: 'special', tier: null, unlock_condition: {type: 'task_streak', min: 14} },
  { code: 'balanced', name: '均衡发展', icon: '⚖️', description: '8大分类均有得分', category: 'special', tier: null, unlock_condition: {type: 'all_categories', min: 8} },
  { code: 'emotion_master', name: '情绪管理', icon: '😊', description: '连续7天没有扣分', category: 'special', tier: null, unlock_condition: {type: 'no_penalty_streak', min: 7} },
  { code: 'saver', name: '节约小能手', icon: '💰', description: '累计1000分不兑换', category: 'special', tier: null, unlock_condition: {type: 'saving', min: 1000} },
  { code: 'hidden_1', name: '神秘徽章', icon: '❓', description: '???', category: 'special', tier: null, unlock_condition: {type: 'hidden', min: 1} }
]

async function initBadges() {
  console.log('🚀 开始初始化徽章系统...\n')

  try {
    // 1. 尝试创建 badges 表（如果不存在）
    console.log('📋 步骤1: 创建 badges 表...')
    let createError1;
    try {
      await supabase.rpc('create_badges_table');
      console.log('  ✅ badges 表创建成功');
    } catch (e) {
      createError1 = e;
      console.log('  ⚠️ 无法通过RPC创建表:', e.message || 'RPC不存在');
      console.log('  ℹ️  将尝试直接插入数据，如果表不存在会报错');
    }

    // 2. 尝试创建 child_badges 表
    console.log('\n📋 步骤2: 创建 child_badges 表...')
    try {
      await supabase.rpc('create_child_badges_table');
      console.log('  ✅ child_badges 表创建成功');
    } catch (e) {
      console.log('  ⚠️ 无法通过RPC创建表:', e.message || 'RPC不存在');
    }

    // 3. 插入徽章数据（使用 upsert 避免重复）
    console.log('\n📋 步骤3: 插入徽章数据...')
    let successCount = 0
    let failCount = 0
    
    for (const badge of badgesData) {
      const { error } = await supabase
        .from('badges')
        .upsert(badge, { onConflict: 'code' })
      
      if (error) {
        console.log(`  ❌ ${badge.name}: ${error.message}`)
        failCount++
      } else {
        console.log(`  ✅ ${badge.icon} ${badge.name}`)
        successCount++
      }
    }

    console.log(`\n📊 结果统计:`)
    console.log(`   成功: ${successCount}/${badgesData.length}`)
    console.log(`   失败: ${failCount}/${badgesData.length}`)

    if (failCount > 0) {
      console.log('\n⚠️ 部分徽章插入失败，可能是因为表不存在')
      console.log('💡 解决方案: 请在 Supabase Dashboard 执行 SQL 脚本')
      console.log('   文件位置: scripts/init-badges-full.sql')
    } else {
      console.log('\n🎉 徽章系统初始化完成！')
    }
    
  } catch (err) {
    console.error('\n❌ 初始化失败:', err.message)
    console.log('\n💡 请手动在 Supabase Dashboard 执行 SQL 脚本')
  }
}

initBadges()
