import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDA2MTM1MiwiZXhwIjoyMDg5NjM3MzUyfQ.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function initBadges() {
  console.log('🚀 初始化徽章系统...')

  try {
    // 1. 创建徽章定义表
    const { error: error1 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS badges (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          code text UNIQUE NOT NULL,
          name text NOT NULL,
          icon text NOT NULL,
          description text,
          category text NOT NULL CHECK (category IN ('milestone', 'streak', 'category', 'special')),
          tier text CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
          unlock_condition jsonb NOT NULL,
          is_active boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
        CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
      `
    })
    
    if (error1) {
      console.log('⚠️ 创建 badges 表失败 (可能已存在或需要手动执行):', error1.message)
    } else {
      console.log('✅ badges 表创建成功')
    }

    // 2. 创建 child_badges 表
    const { error: error2 } = await supabase.rpc('exec_sql', {
      sql: `
        CREATE TABLE IF NOT EXISTS child_badges (
          id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
          child_id uuid REFERENCES children(id) ON DELETE CASCADE,
          badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
          unlocked_at timestamptz DEFAULT now(),
          is_new boolean DEFAULT true,
          created_at timestamptz DEFAULT now(),
          UNIQUE(child_id, badge_id)
        );
        CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
        CREATE INDEX IF NOT EXISTS idx_child_badges_new ON child_badges(child_id, is_new) WHERE is_new = true;
      `
    })
    
    if (error2) {
      console.log('⚠️ 创建 child_badges 表失败:', error2.message)
    } else {
      console.log('✅ child_badges 表创建成功')
    }

    // 3. 插入徽章数据
    const badges = [
      // 里程碑徽章
      { code: 'novice_100', name: '初出茅庐', icon: '🌱', desc: '累计获得100积分', cat: 'milestone', tier: 'bronze', cond: {type: 'total_points', min: 100} },
      { code: 'advanced_500', name: '小有所成', icon: '🌿', desc: '累计获得500积分', cat: 'milestone', tier: 'silver', cond: {type: 'total_points', min: 500} },
      { code: 'expert_1000', name: '积少成多', icon: '🌳', desc: '累计获得1000积分', cat: 'milestone', tier: 'gold', cond: {type: 'total_points', min: 1000} },
      { code: 'master_5000', name: '富豪榜', icon: '👑', desc: '累计获得5000积分', cat: 'milestone', tier: 'diamond', cond: {type: 'total_points', min: 5000} },
      { code: 'week_1', name: '一周新人', icon: '🐣', desc: '使用系统满7天', cat: 'milestone', tier: 'bronze', cond: {type: 'days_active', min: 7} },
      { code: 'month_1', name: '月度达人', icon: '🐥', desc: '使用系统满30天', cat: 'milestone', tier: 'silver', cond: {type: 'days_active', min: 30} },
      { code: 'first_redeem', name: '首次兑换', icon: '🛒', desc: '第一次兑换奖品', cat: 'milestone', tier: 'bronze', cond: {type: 'redeem_count', min: 1} },
      // 连续徽章
      { code: 'streak_3', name: '3天连胜', icon: '🔥', desc: '连续3天有加分记录', cat: 'streak', tier: 'bronze', cond: {type: 'streak_days', min: 3} },
      { code: 'streak_7', name: '7天连胜', icon: '🔥🔥', desc: '连续7天有加分记录', cat: 'streak', tier: 'silver', cond: {type: 'streak_days', min: 7} },
      { code: 'streak_14', name: '14天连胜', icon: '🔥🔥🔥', desc: '连续14天有加分记录', cat: 'streak', tier: 'gold', cond: {type: 'streak_days', min: 14} },
      { code: 'full_month', name: '全勤宝宝', icon: '⭐', desc: '一个月每天都活跃', cat: 'streak', tier: 'gold', cond: {type: 'full_month', min: 1} },
      // 分类徽章
      { code: 'sports_bronze', name: '运动新星', icon: '🏃', desc: '运动健康类获得50分', cat: 'category', tier: 'bronze', cond: {type: 'category_points', category: '运动健康', min: 50} },
      { code: 'study_bronze', name: '小学霸', icon: '📚', desc: '学习成长类获得50分', cat: 'category', tier: 'bronze', cond: {type: 'category_points', category: '学习成长', min: 50} },
      { code: 'life_bronze', name: '小帮手', icon: '🧹', desc: '生活自理类获得30分', cat: 'category', tier: 'bronze', cond: {type: 'category_points', category: '生活自理', min: 30} },
      { code: 'art_bronze', name: '小艺术家', icon: '🎨', desc: '艺术创造类获得30分', cat: 'category', tier: 'bronze', cond: {type: 'category_points', category: '艺术创造', min: 30} },
    ]

    for (const b of badges) {
      const { error } = await supabase
        .from('badges')
        .upsert({
          code: b.code,
          name: b.name,
          icon: b.icon,
          description: b.desc,
          category: b.cat,
          tier: b.tier,
          unlock_condition: b.cond
        }, { onConflict: 'code' })
      
      if (error) {
        console.log(`⚠️ 插入徽章 ${b.code} 失败:`, error.message)
      } else {
        console.log(`✅ 徽章 ${b.name} 已添加`)
      }
    }

    console.log('\n🎉 徽章系统初始化完成！')
    
  } catch (err) {
    console.error('❌ 初始化失败:', err.message)
  }
}

initBadges()
