-- ============================================
-- 多家庭账号体系 - 完整迁移脚本 v3.0
-- 可重复执行，自动处理已存在的对象
-- ============================================

-- ============================================
-- 第一部分：添加用户关联字段（安全版）
-- ============================================

DO $$
BEGIN
  -- children 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='children' AND column_name='user_id') THEN
    ALTER TABLE children ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- rules 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rules' AND column_name='user_id') THEN
    ALTER TABLE rules ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- tasks 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='tasks' AND column_name='user_id') THEN
    ALTER TABLE tasks ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- transactions 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='transactions' AND column_name='user_id') THEN
    ALTER TABLE transactions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- task_progress 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='task_progress' AND column_name='user_id') THEN
    ALTER TABLE task_progress ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;

  -- task_completions 表
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='task_completions' AND column_name='user_id') THEN
    ALTER TABLE task_completions ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================
-- 第二部分：创建家庭设置表
-- ============================================

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

-- ============================================
-- 第三部分：启用 RLS
-- ============================================

ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第四部分：删除旧策略（避免重复错误）
-- ============================================

-- Children 表
DROP POLICY IF EXISTS "Users can only see their own children" ON children;
DROP POLICY IF EXISTS "Users can only insert their own children" ON children;
DROP POLICY IF EXISTS "Users can only update their own children" ON children;
DROP POLICY IF EXISTS "Users can only delete their own children" ON children;

-- Rules 表
DROP POLICY IF EXISTS "Users can only see their own rules" ON rules;
DROP POLICY IF EXISTS "Users can only insert their own rules" ON rules;
DROP POLICY IF EXISTS "Users can only update their own rules" ON rules;
DROP POLICY IF EXISTS "Users can only delete their own rules" ON rules;

-- Tasks 表
DROP POLICY IF EXISTS "Users can only see their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can only delete their own tasks" ON tasks;

-- Transactions 表
DROP POLICY IF EXISTS "Users can only see their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can only insert their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can only update their own transactions" ON transactions;

-- Task Progress 表
DROP POLICY IF EXISTS "Users can only see their own task progress" ON task_progress;
DROP POLICY IF EXISTS "Users can only insert their own task progress" ON task_progress;
DROP POLICY IF EXISTS "Users can only update their own task progress" ON task_progress;

-- Task Completions 表
DROP POLICY IF EXISTS "Users can only see their own completions" ON task_completions;
DROP POLICY IF EXISTS "Users can only insert their own completions" ON task_completions;

-- Family Settings 表
DROP POLICY IF EXISTS "Users can only see their own settings" ON family_settings;
DROP POLICY IF EXISTS "Users can only insert their own settings" ON family_settings;
DROP POLICY IF EXISTS "Users can only update their own settings" ON family_settings;

-- ============================================
-- 第五部分：创建 RLS 策略
-- ============================================

-- Children 表策略
CREATE POLICY "Users can only see their own children"
  ON children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own children"
  ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own children"
  ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own children"
  ON children FOR DELETE USING (auth.uid() = user_id);

-- Rules 表策略
CREATE POLICY "Users can only see their own rules"
  ON rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own rules"
  ON rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own rules"
  ON rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own rules"
  ON rules FOR DELETE USING (auth.uid() = user_id);

-- Tasks 表策略
CREATE POLICY "Users can only see their own tasks"
  ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own tasks"
  ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own tasks"
  ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own tasks"
  ON tasks FOR DELETE USING (auth.uid() = user_id);

-- Transactions 表策略
CREATE POLICY "Users can only see their own transactions"
  ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own transactions"
  ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own transactions"
  ON transactions FOR UPDATE USING (auth.uid() = user_id);

-- Task Progress 表策略
CREATE POLICY "Users can only see their own task progress"
  ON task_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own task progress"
  ON task_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own task progress"
  ON task_progress FOR UPDATE USING (auth.uid() = user_id);

-- Task Completions 表策略
CREATE POLICY "Users can only see their own completions"
  ON task_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own completions"
  ON task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Family Settings 表策略
CREATE POLICY "Users can only see their own settings"
  ON family_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own settings"
  ON family_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own settings"
  ON family_settings FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 第六部分：创建索引
-- ============================================

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_user_id ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);

-- ============================================
-- 第七部分：创建触发器自动填充 user_id
-- ============================================

-- 创建函数
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Children 触发器
DROP TRIGGER IF EXISTS set_children_user_id ON children;
CREATE TRIGGER set_children_user_id
  BEFORE INSERT ON children
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Rules 触发器
DROP TRIGGER IF EXISTS set_rules_user_id ON rules;
CREATE TRIGGER set_rules_user_id
  BEFORE INSERT ON rules
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Tasks 触发器
DROP TRIGGER IF EXISTS set_tasks_user_id ON tasks;
CREATE TRIGGER set_tasks_user_id
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Transactions 触发器
DROP TRIGGER IF EXISTS set_transactions_user_id ON transactions;
CREATE TRIGGER set_transactions_user_id
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Task Progress 触发器
DROP TRIGGER IF EXISTS set_task_progress_user_id ON task_progress;
CREATE TRIGGER set_task_progress_user_id
  BEFORE INSERT ON task_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- Task Completions 触发器
DROP TRIGGER IF EXISTS set_task_completions_user_id ON task_completions;
CREATE TRIGGER set_task_completions_user_id
  BEFORE INSERT ON task_completions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- ============================================
-- 完成
-- ============================================

SELECT '多家庭账号体系迁移完成！v3.0' AS message;
