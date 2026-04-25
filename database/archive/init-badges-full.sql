-- 儿童行为银行 - v4.0 徽章系统数据库初始化脚本
-- 执行此脚本创建徽章相关表和数据

-- ============================================
-- 1. 创建徽章定义表
-- ============================================
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

-- 创建索引
CREATE INDEX idx_badges_category ON badges(category);
CREATE INDEX idx_badges_active ON badges(is_active);

-- ============================================
-- 2. 创建孩子获得徽章记录表
-- ============================================
CREATE TABLE IF NOT EXISTS child_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  is_new boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(child_id, badge_id)
);

-- 创建索引
CREATE INDEX idx_child_badges_child ON child_badges(child_id);
CREATE INDEX idx_child_badges_new ON child_badges(child_id, is_new) WHERE is_new = true;

-- ============================================
-- 3. 插入徽章数据（39个）
-- ============================================

-- 里程碑徽章（10个）
INSERT INTO badges (code, name, icon, description, category, tier, unlock_condition) VALUES
('novice_100', '初出茅庐', '🌱', '累计获得100积分', 'milestone', 'bronze', '{"type": "total_points", "min": 100}'),
('advanced_500', '小有所成', '🌿', '累计获得500积分', 'milestone', 'silver', '{"type": "total_points", "min": 500}'),
('expert_1000', '积少成多', '🌳', '累计获得1000积分', 'milestone', 'gold', '{"type": "total_points", "min": 1000}'),
('master_5000', '富豪榜', '👑', '累计获得5000积分', 'milestone', 'diamond', '{"type": "total_points", "min": 5000}'),
('week_1', '一周新人', '🐣', '使用系统满7天', 'milestone', 'bronze', '{"type": "days_active", "min": 7}'),
('month_1', '月度达人', '🐥', '使用系统满30天', 'milestone', 'silver', '{"type": "days_active", "min": 30}'),
('quarter_1', '季度明星', '🦅', '使用系统满90天', 'milestone', 'gold', '{"type": "days_active", "min": 90}'),
('year_1', '年度传奇', '🐉', '使用系统满365天', 'milestone', 'diamond', '{"type": "days_active", "min": 365}'),
('first_redeem', '首次兑换', '🛒', '第一次兑换奖品', 'milestone', 'bronze', '{"type": "redeem_count", "min": 1}'),
('redeem_10', '购物狂', '🎁', '累计兑换10次奖品', 'milestone', 'silver', '{"type": "redeem_count", "min": 10}')
ON CONFLICT (code) DO NOTHING;

-- 连续徽章（5个）
INSERT INTO badges (code, name, icon, description, category, tier, unlock_condition) VALUES
('streak_3', '3天连胜', '🔥', '连续3天有加分记录', 'streak', 'bronze', '{"type": "streak_days", "min": 3}'),
('streak_7', '7天连胜', '🔥🔥', '连续7天有加分记录', 'streak', 'silver', '{"type": "streak_days", "min": 7}'),
('streak_14', '14天连胜', '🔥🔥🔥', '连续14天有加分记录', 'streak', 'gold', '{"type": "streak_days", "min": 14}'),
('streak_30', '30天连胜', '💫', '连续30天有加分记录', 'streak', 'diamond', '{"type": "streak_days", "min": 30}'),
('full_month', '全勤宝宝', '⭐', '一个月每天都活跃', 'streak', 'gold', '{"type": "full_month", "min": 1}')
ON CONFLICT (code) DO NOTHING;

-- 分类徽章（16个 = 8分类 × 2等级）
INSERT INTO badges (code, name, icon, description, category, tier, unlock_condition) VALUES
-- 运动健康
('sports_bronze', '运动新星', '🏃', '运动健康类获得50分', 'category', 'bronze', '{"type": "category_points", "category": "运动健康", "min": 50}'),
('sports_gold', '运动健将', '🏆', '运动健康类获得200分', 'category', 'gold', '{"type": "category_points", "category": "运动健康", "min": 200}'),
-- 学习成长
('study_bronze', '小学霸', '📚', '学习成长类获得50分', 'category', 'bronze', '{"type": "category_points", "category": "学习成长", "min": 50}'),
('study_gold', '大学霸', '🎓', '学习成长类获得200分', 'category', 'gold', '{"type": "category_points", "category": "学习成长", "min": 200}'),
-- 生活自理
('life_bronze', '小帮手', '🧹', '生活自理类获得30分', 'category', 'bronze', '{"type": "category_points", "category": "生活自理", "min": 30}'),
('life_gold', '家务达人', '🏠', '生活自理类获得100分', 'category', 'gold', '{"type": "category_points", "category": "生活自理", "min": 100}'),
-- 艺术创造
('art_bronze', '小艺术家', '🎨', '艺术创造类获得30分', 'category', 'bronze', '{"type": "category_points", "category": "艺术创造", "min": 30}'),
('art_gold', '艺术大师', '🎭', '艺术创造类获得100分', 'category', 'gold', '{"type": "category_points", "category": "艺术创造", "min": 100}'),
-- 品德社交
('moral_bronze', '暖心宝贝', '💝', '品德社交类获得30分', 'category', 'bronze', '{"type": "category_points", "category": "品德社交", "min": 30}'),
('moral_gold', '品德模范', '🌟', '品德社交类获得100分', 'category', 'gold', '{"type": "category_points", "category": "品德社交", "min": 100}'),
-- 作息规律
('routine_bronze', '按时宝宝', '⏰', '作息规律类获得30分', 'category', 'bronze', '{"type": "category_points", "category": "作息规律", "min": 30}'),
('routine_gold', '作息大师', '🌙', '作息规律类获得100分', 'category', 'gold', '{"type": "category_points", "category": "作息规律", "min": 100}'),
-- 健康饮食
('diet_bronze', '不挑食', '🍎', '健康饮食类获得20分', 'category', 'bronze', '{"type": "category_points", "category": "健康饮食", "min": 20}'),
('diet_gold', '健康达人', '🥗', '健康饮食类获得80分', 'category', 'gold', '{"type": "category_points", "category": "健康饮食", "min": 80}'),
-- 其他
('other_bronze', '全面发展', '⭐', '其他类获得20分', 'category', 'bronze', '{"type": "category_points", "category": "其他", "min": 20}'),
('other_gold', '全能宝贝', '💎', '其他类获得80分', 'category', 'gold', '{"type": "category_points", "category": "其他", "min": 80}')
ON CONFLICT (code) DO NOTHING;

-- 特殊徽章（8个）
INSERT INTO badges (code, name, icon, description, category, tier, unlock_condition) VALUES
('perfect_day', '完美一天', '🌈', '单日获得5个不同规则的加分', 'special', null, '{"type": "unique_rules_day", "min": 5}'),
('comeback', '逆风翻盘', '🚀', '单日从负分变为正分', 'special', null, '{"type": "comeback", "min": 1}'),
('early_bird', '早起鸟', '🌅', '连续7天在8点前起床', 'special', null, '{"type": "early_riser", "min": 7}'),
('self_discipline', '自律达人', '🎯', '连续完成同一任务14天', 'special', null, '{"type": "task_streak", "min": 14}'),
('balanced', '均衡发展', '⚖️', '8大分类均有得分', 'special', null, '{"type": "all_categories", "min": 8}'),
('emotion_master', '情绪管理', '😊', '连续7天没有扣分', 'special', null, '{"type": "no_penalty_streak", "min": 7}'),
('saver', '节约小能手', '💰', '累计1000分不兑换', 'special', null, '{"type": "saving", "min": 1000}'),
('hidden_1', '神秘徽章', '❓', '???', 'special', null, '{"type": "hidden", "min": 1}')
ON CONFLICT (code) DO NOTHING;

-- ============================================
-- 4. 创建触发器更新时间戳
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- 5. 验证数据
-- ============================================
SELECT category, COUNT(*) as count FROM badges GROUP BY category ORDER BY category;
