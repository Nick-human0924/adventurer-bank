-- ============================================
-- 007_task_progress_fix.sql
-- 修复 task_progress 列名不一致：last_check_date → last_completed_date
-- ============================================

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

ALTER TABLE task_progress ADD COLUMN IF NOT EXISTS first_completed_date DATE;
