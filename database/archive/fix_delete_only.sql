-- 只运行这段：添加删除权限（独立脚本）

-- 删除已存在的策略（避免报错）
DROP POLICY IF EXISTS "Users can delete their own transactions" ON transactions;

-- 创建删除权限策略
CREATE POLICY "Users can delete their own transactions" 
ON transactions 
FOR DELETE 
USING (auth.uid() = user_id);

-- 验证
SELECT '删除权限策略已创建' as status;
