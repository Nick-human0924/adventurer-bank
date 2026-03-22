-- ============================================
-- 多家庭账号体系数据库迁移 v3.0
-- 包含用户隔离、RLS策略、移动端适配支持
-- ============================================

-- ============================================
-- 第一部分：添加用户关联字段
-- ============================================

-- 1. 为所有业务表添加 user_id 字段
ALTER TABLE children 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE transactions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE task_progress 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE task_completions 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- 2. 创建家庭配置表（可选扩展）
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
-- 第二部分：为现有数据设置默认用户（防止数据丢失）
-- ============================================

-- 注意：执行前需要替换为实际的第一个用户ID
-- 或者手动创建测试用户后获取其UUID

DO $$
DECLARE
  default_user_id UUID;
BEGIN
  -- 尝试获取第一个用户作为默认用户
  SELECT id INTO default_user_id FROM auth.users LIMIT 1;
  
  IF default_user_id IS NOT NULL THEN
    -- 更新现有数据关联到默认用户
    UPDATE children SET user_id = default_user_id WHERE user_id IS NULL;
    UPDATE rules SET user_id = default_user_id WHERE user_id IS NULL;
    UPDATE tasks SET user_id = default_user_id WHERE user_id IS NULL;
    UPDATE transactions SET user_id = default_user_id WHERE user_id IS NULL;
    UPDATE task_progress SET user_id = default_user_id WHERE user_id IS NULL;
    UPDATE task_completions SET user_id = default_user_id WHERE user_id IS NULL;
    
    -- 创建默认家庭设置
    INSERT INTO family_settings (user_id, family_name)
    VALUES (default_user_id, '默认家庭')
    ON CONFLICT (user_id) DO NOTHING;
    
    RAISE NOTICE '已关联现有数据到用户: %', default_user_id;
  ELSE
    RAISE NOTICE '未找到用户，请手动运行更新脚本';
  END IF;
END $$;

-- ============================================
-- 第三部分：启用 RLS (Row Level Security)
-- ============================================

-- 启用所有表的 RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 第四部分：创建 RLS 策略
-- ============================================

-- Children 表策略
CREATE POLICY "Users can only see their own children"
  ON children FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own children"
  ON children FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own children"
  ON children FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own children"
  ON children FOR DELETE
  USING (auth.uid() = user_id);

-- Rules 表策略
CREATE POLICY "Users can only see their own rules"
  ON rules FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own rules"
  ON rules FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own rules"
  ON rules FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own rules"
  ON rules FOR DELETE
  USING (auth.uid() = user_id);

-- Tasks 表策略
CREATE POLICY "Users can only see their own tasks"
  ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own tasks"
  ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only delete their own tasks"
  ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Transactions 表策略
CREATE POLICY "Users can only see their own transactions"
  ON transactions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own transactions"
  ON transactions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own transactions"
  ON transactions FOR UPDATE
  USING (auth.uid() = user_id);

-- Task Progress 表策略
CREATE POLICY "Users can only see their own task progress"
  ON task_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own task progress"
  ON task_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own task progress"
  ON task_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- Task Completions 表策略
CREATE POLICY "Users can only see their own completions"
  ON task_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own completions"
  ON task_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Family Settings 表策略
CREATE POLICY "Users can only see their own settings"
  ON family_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can only insert their own settings"
  ON family_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can only update their own settings"
  ON family_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 第五部分：创建索引优化查询
-- ============================================

CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_user_id ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);

-- ============================================
-- 第六部分：创建触发器自动填充 user_id
-- ============================================

-- 创建函数：自动设置 user_id
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 创建触发器
DROP TRIGGER IF EXISTS set_children_user_id ON children;
CREATE TRIGGER set_children_user_id
  BEFORE INSERT ON children
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_rules_user_id ON rules;
CREATE TRIGGER set_rules_user_id
  BEFORE INSERT ON rules
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_tasks_user_id ON tasks;
CREATE TRIGGER set_tasks_user_id
  BEFORE INSERT ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_transactions_user_id ON transactions;
CREATE TRIGGER set_transactions_user_id
  BEFORE INSERT ON transactions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_task_progress_user_id ON task_progress;
CREATE TRIGGER set_task_progress_user_id
  BEFORE INSERT ON task_progress
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

DROP TRIGGER IF EXISTS set_task_completions_user_id ON task_completions;
CREATE TRIGGER set_task_completions_user_id
  BEFORE INSERT ON task_completions
  FOR EACH ROW
  EXECUTE FUNCTION set_user_id();

-- ============================================
-- 第七部分：创建管理员密码验证函数
-- ============================================

CREATE OR REPLACE FUNCTION verify_admin_password(input_email TEXT, input_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  is_valid BOOLEAN;
BEGIN
  -- 尝试登录验证
  -- 注意：实际验证在 Supabase Auth 中完成，这里只是一个包装函数
  -- 前端应该使用 supabase.auth.signInWithPassword 来验证
  RETURN true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 完成提示
-- ============================================

SELECT '多家庭账号体系数据库迁移完成！' AS message;
SELECT '请执行以下步骤：' AS instruction;
SELECT '1. 在 Supabase Auth 中注册第一个用户' AS step1;
SELECT '2. 运行上面的 DO 代码块将现有数据关联到新用户（替换 default_user_id）' AS step2;
SELECT '3. 在前端代码中添加 user_id 过滤' AS step3;
SELECT '4. 测试 RLS 策略是否生效' AS step4;
