-- ============================================
-- 006_badges_system.sql
-- 徽章系统：badges + child_badges
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'category', 'special')),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  unlock_condition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

CREATE TABLE IF NOT EXISTS child_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
CREATE INDEX IF NOT EXISTS idx_child_badges_new ON child_badges(child_id, is_new) WHERE is_new = true;

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view badges" ON badges FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Users can view child badges" ON child_badges FOR SELECT USING (EXISTS (SELECT 1 FROM children WHERE children.id = child_badges.child_id AND children.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
