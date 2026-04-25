-- 修复 task_progress 表 schema 不一致问题
-- 远程数据库当前使用 last_check_date，而 migration 和代码期望 last_completed_date

-- 1. 如果存在 last_check_date 但没有 last_completed_date，则重命名
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_progress' AND column_name = 'last_check_date'
    ) AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'task_progress' AND column_name = 'last_completed_date'
    ) THEN
        ALTER TABLE task_progress RENAME COLUMN last_check_date TO last_completed_date;
        RAISE NOTICE 'Renamed last_check_date to last_completed_date';
    END IF;
END $$;

-- 2. 添加 first_completed_date（如果不存在）
ALTER TABLE task_progress 
ADD COLUMN IF NOT EXISTS first_completed_date DATE;

-- 3. 确认列已就位
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'task_progress' AND table_schema = 'public'
ORDER BY ordinal_position;
