-- 修复行为记录删除权限（正确版本）
-- 在 Supabase SQL Editor 中运行

-- 方法1：先删除再创建（推荐）
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

CREATE POLICY "Users can delete their own transactions" 
ON transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 验证策略是否创建成功
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'transactions';
