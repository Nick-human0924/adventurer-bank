-- ============================================
-- 添加 rules 表 category 字段
-- ============================================

-- 添加 category 字段（如果不存在）
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_name='rules' AND column_name='category') THEN
    ALTER TABLE rules ADD COLUMN category TEXT DEFAULT 'study';
  END IF;
END $$;

-- 为现有数据设置默认值
UPDATE rules SET category = 'study' WHERE category IS NULL;

-- 添加注释
COMMENT ON COLUMN rules.category IS '规则分类：study(学习类), attitude(态度和品德), improvement(控制和改正)';
