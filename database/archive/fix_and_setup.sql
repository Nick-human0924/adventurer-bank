-- ============================================
-- 一键修复脚本：添加孩子并优化 RLS
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================

-- 1. 首先添加孩子（使用 SECURITY DEFINER 函数绕过 RLS）
CREATE OR REPLACE FUNCTION add_child_bypass_rls()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO children (name, avatar, total_points, current_balance, created_at)
  VALUES ('申安哲', '👶', 0, 0, NOW())
  ON CONFLICT DO NOTHING;
END;
$$;

-- 执行添加
SELECT add_child_bypass_rls();

-- 2. 验证添加成功
SELECT * FROM children WHERE name = '申安哲';

-- 3. 创建更宽松的 RLS 策略

-- children 表：允许所有操作
DROP POLICY IF EXISTS "Allow all operations" ON children;
CREATE POLICY "Allow all operations" ON children
  FOR ALL USING (true) WITH CHECK (true);

-- rules 表：允许所有操作
DROP POLICY IF EXISTS "Allow all operations on rules" ON rules;
CREATE POLICY "Allow all operations on rules" ON rules
  FOR ALL USING (true) WITH CHECK (true);

-- transactions 表：允许所有操作
DROP POLICY IF EXISTS "Allow all operations on transactions" ON transactions;
CREATE POLICY "Allow all operations on transactions" ON transactions
  FOR ALL USING (true) WITH CHECK (true);

-- 4. 删除临时函数
DROP FUNCTION IF EXISTS add_child_bypass_rls();

-- 5. 最终结果验证
SELECT '✅ 修复完成！' as status;
SELECT * FROM children;
SELECT * FROM rules LIMIT 5;
