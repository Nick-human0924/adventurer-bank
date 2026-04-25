-- ============================================
-- 002_add_category.sql
-- 为 rules 表添加分类和图标字段
-- ============================================

ALTER TABLE rules 
ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'other',
ADD COLUMN IF NOT EXISTS icon_emoji TEXT DEFAULT '⭐';

UPDATE rules SET category = 'other' WHERE category IS NULL;
UPDATE rules SET icon_emoji = icon WHERE icon_emoji IS NULL AND icon IS NOT NULL;

COMMENT ON COLUMN rules.category IS '规则分类：运动健康, 学习成长, 生活自理, 艺术创造, 品德社交, 作息规律, 健康饮食, 其他';
