-- 修复行为记录无法删除的问题
-- 在 Supabase SQL Editor 中运行此脚本

-- 为 transactions 表添加删除权限策略
CREATE POLICY IF NOT EXISTS "Users can delete their own transactions" ON transactions
    FOR DELETE USING (auth.uid() = user_id);

-- 验证策略是否创建成功
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'transactions';
