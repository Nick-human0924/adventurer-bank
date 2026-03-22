// 冒险家银行规则数据 - 用于批量导入 Supabase
// 执行: node seed-rules.js

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://agkemugaxrhrsnbyiluw.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFna2VtdWdheHJocnNuYnlpbHV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwNjEzNTIsImV4cCI6MjA4OTYzNzM1Mn0.eGg3eo7PLrgcjHfLeOW5vq7ElMQbGT2I4RPpxmPdLUo'

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

const rules = [
  // 📚 智慧成长 (学习类)
  { rule_name: '自己主动读书', keywords: ['读书', '看书'], category: 'learning', coin_change: 10, gem_change: 0, icon_asset: '📚' },
  { rule_name: '主动弹钢琴', keywords: ['弹琴', '钢琴'], category: 'learning', coin_change: 10, gem_change: 0, icon_asset: '🎹' },
  { rule_name: '完成ABC Reading', keywords: ['ABC', '英语阅读'], category: 'learning', coin_change: 5, gem_change: 0, icon_asset: '🔤' },
  { rule_name: '背诵古诗', keywords: ['背诗', '古诗'], category: 'learning', coin_change: 10, gem_change: 0, icon_asset: '📜' },
  { rule_name: '学习围棋', keywords: ['围棋', '下棋'], category: 'learning', coin_change: 10, gem_change: 0, icon_asset: '⚫' },
  { rule_name: '专注力挑战', keywords: ['专注', '安静'], category: 'learning', coin_change: 10, gem_change: 0, icon_asset: '🎯' },
  
  // 🏃 活力无限 (运动类)
  { rule_name: '踢球', keywords: ['踢球', '足球'], category: 'sports', coin_change: 10, gem_change: 0, icon_asset: '⚽' },
  { rule_name: '跑步', keywords: ['跑步'], category: 'sports', coin_change: 5, gem_change: 0, icon_asset: '🏃' },
  { rule_name: '打羽毛球', keywords: ['羽毛球'], category: 'sports', coin_change: 10, gem_change: 0, icon_asset: '🏸' },
  { rule_name: '跳绳', keywords: ['跳绳'], category: 'sports', coin_change: 5, gem_change: 0, icon_asset: '🪢' },
  { rule_name: '户外活动', keywords: ['户外', '公园'], category: 'sports', coin_change: 10, gem_change: 0, icon_asset: '🌳' },
  
  // 🏠 家庭小主人 (生活与自理)
  { rule_name: '获得夸奖', keywords: ['夸奖', '表扬'], category: 'life', coin_change: 5, gem_change: 0, icon_asset: '👏' },
  { rule_name: '帮忙做家务', keywords: ['家务', '帮忙'], category: 'life', coin_change: 5, gem_change: 0, icon_asset: '🧹' },
  { rule_name: '玩具归位', keywords: ['收拾', '归位', '整理'], category: 'life', coin_change: 10, gem_change: 0, icon_asset: '🧸' },
  { rule_name: '自己穿衣穿鞋', keywords: ['穿衣', '穿鞋'], category: 'life', coin_change: 5, gem_change: 0, icon_asset: '👕' },
  { rule_name: '主动刷牙洗脸', keywords: ['刷牙', '洗脸'], category: 'life', coin_change: 5, gem_change: 0, icon_asset: '🪥' },
  { rule_name: '按时睡觉', keywords: ['睡觉', '上床'], category: 'life', coin_change: 10, gem_change: 0, icon_asset: '🛏️' },
  
  // ❤️ 社交与礼仪 (情商类)
  { rule_name: '主动分享', keywords: ['分享'], category: 'social', coin_change: 10, gem_change: 0, icon_asset: '🎁' },
  { rule_name: '礼貌用语', keywords: ['谢谢', '请', '你好'], category: 'social', coin_change: 5, gem_change: 0, icon_asset: '🙏' },
  { rule_name: '安慰他人', keywords: ['安慰', '抱抱', '爱'], category: 'social', coin_change: 10, gem_change: 0, icon_asset: '❤️' },
  
  // ⚠️ 红线与惩罚 (扣除金币)
  { rule_name: '趴在地上', keywords: ['趴地', '地上'], category: 'penalty', coin_change: -10, gem_change: 0, icon_asset: '🚫' },
  { rule_name: '吃饭离席', keywords: ['离席', '不吃饭'], category: 'penalty', coin_change: -10, gem_change: 0, icon_asset: '🍽️' },
  { rule_name: '打人', keywords: ['打人', '推人'], category: 'penalty', coin_change: -50, gem_change: 0, icon_asset: '👊' },
  { rule_name: '乱发脾气', keywords: ['发脾气', '哭闹'], category: 'penalty', coin_change: -20, gem_change: 0, icon_asset: '😤' },
  { rule_name: '说不礼貌的话', keywords: ['骂人', '坏话'], category: 'penalty', coin_change: -10, gem_change: 0, icon_asset: '🤬' },
  { rule_name: '玩具不归位', keywords: ['不收玩具'], category: 'penalty', coin_change: -5, gem_change: 0, icon_asset: '🚯' },
]

async function seedRules() {
  console.log('🎩 小艺开始导入冒险家银行规则...\n')
  
  // 插入新规则
  const rulesToInsert = rules.map(r => ({ ...r, is_active: true }))
  
  const { data, error } = await supabase
    .from('rules_config')
    .insert(rulesToInsert)
  
  if (error) {
    console.error('❌ 导入失败:', error)
    process.exit(1)
  }
  
  console.log(`✅ 成功导入 ${rules.length} 条规则\n`)
  console.log('📊 规则分类统计:')
  console.log(`  📚 智慧成长 (学习类): ${rules.filter(r => r.category === 'learning').length} 条`)
  console.log(`  🏃 活力无限 (运动类): ${rules.filter(r => r.category === 'sports').length} 条`)
  console.log(`  🏠 家庭小主人 (生活类): ${rules.filter(r => r.category === 'life').length} 条`)
  console.log(`  ❤️ 社交与礼仪 (情商类): ${rules.filter(r => r.category === 'social').length} 条`)
  console.log(`  ⚠️ 红线与惩罚: ${rules.filter(r => r.category === 'penalty').length} 条`)
  console.log(`\n💰 金币奖励范围: +5 ~ +10 (正向) / -5 ~ -50 (惩罚)`)
}

seedRules()
