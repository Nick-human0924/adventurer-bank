-- 数据库性能优化索引

-- 加速按用户查询
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);

-- 加速按孩子查询
CREATE INDEX IF NOT EXISTS idx_transactions_child_id ON transactions(child_id);

-- 加速按日期查询
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 验证索引创建
SELECT indexname, indexdef 
FROM pg_indexes 
WHERE tablename IN ('children', 'rules', 'transactions')
ORDER BY tablename, indexname;
