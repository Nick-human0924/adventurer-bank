-- 在 Supabase Dashboard → SQL Editor 中执行
-- 链接: https://supabase.com/dashboard/project/agkemugaxrhrsnbyiluw/sql/new

-- 1. 创建 badges 表
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
  created_at timestamptz DEFAULT now()
);

-- 2. 创建 child_badges 表
CREATE TABLE IF NOT EXISTS child_badges (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id uuid REFERENCES children(id) ON DELETE CASCADE,
  badge_id uuid REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at timestamptz DEFAULT now(),
  is_new boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  UNIQUE(child_id, badge_id)
);

-- 3. 创建索引
CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);
CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
CREATE INDEX IF NOT EXISTS idx_child_badges_new ON child_badges(child_id, is_new) WHERE is_new = true;
