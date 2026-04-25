-- ============================================
-- 004_multi_family.sql
-- 多家庭账号体系：统一 user_id 关联 + RLS + 自动填充触发器
-- ============================================

-- 1. 为所有业务表安全添加 user_id
DO $$
BEGIN
  FOR t_name IN 
    SELECT t.tablename 
    FROM pg_tables t 
    WHERE t.schemaname = 'public' 
      AND t.tablename IN ('children','rules','tasks','transactions','task_progress','task_completions','challenge_progress','task_assignments')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = t_name.tablename AND column_name = 'user_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE', t_name.tablename);
    END IF;
  END LOOP;
END $$;

-- 2. 家庭设置表
CREATE TABLE IF NOT EXISTS family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  family_name VARCHAR(100) DEFAULT '我的家庭',
  currency_name VARCHAR(20) DEFAULT '积分',
  theme VARCHAR(20) DEFAULT 'default',
  allow_child_login BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own settings" ON family_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own settings" ON family_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own settings" ON family_settings FOR UPDATE USING (auth.uid() = user_id);

-- 3. 统一启用 RLS（可重复执行）
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('children','rules','tasks','transactions','task_progress','task_completions','prizes','orders','gem_transactions','family_settings','badges','child_badges')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
    END LOOP;
END $$;

-- 4. 清理并重建统一的 RLS 策略
DO $$
DECLARE
    t TEXT;
    old_policies TEXT[];
    p TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['children','rules','tasks','transactions','task_progress','task_completions','family_settings'])
    LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
        END LOOP;
    END LOOP;
END $$;

CREATE POLICY "Users can only see their own children" ON children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own children" ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own children" ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own children" ON children FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own rules" ON rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own rules" ON rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own rules" ON rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own rules" ON rules FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own task progress" ON task_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own task progress" ON task_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own task progress" ON task_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own task progress" ON task_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own completions" ON task_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own completions" ON task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own completions" ON task_completions FOR DELETE USING (auth.uid() = user_id);

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_user_id ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_child_id ON transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 6. 自动填充 user_id 触发器
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['children','rules','tasks','transactions','task_progress','task_completions'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_user_id ON %I', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_user_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION set_user_id()', t, t);
    END LOOP;
END $$;
