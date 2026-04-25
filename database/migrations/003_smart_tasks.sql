-- ============================================
-- 003_smart_tasks.sql
-- 智能任务系统：task_progress + task_completions + 核心函数
-- ============================================

-- 1. 迁移旧数据（如果存在旧 type 字段）
UPDATE tasks SET 
  task_type = CASE 
    WHEN type = 'streak' THEN 'continuous'
    WHEN type = 'challenge' THEN 'cumulative' 
    WHEN type = 'daily' THEN 'single'
    ELSE 'single'
  END,
  target_count = COALESCE(required_completions, 1),
  reward_points = COALESCE(points, 0),
  is_repeatable = (type = 'daily'),
  target_streak = COALESCE(duration_days, 0),
  current_streak = 0
WHERE task_type IS DISTINCT FROM 
  CASE 
    WHEN type = 'streak' THEN 'continuous'
    WHEN type = 'challenge' THEN 'cumulative' 
    WHEN type = 'daily' THEN 'single'
    ELSE 'single'
  END;

-- 2. task_progress 表
CREATE TABLE IF NOT EXISTS task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    current_count INTEGER DEFAULT 0,
    streak_count INTEGER DEFAULT 0,
    longest_streak INTEGER DEFAULT 0,
    last_completed_date DATE,
    first_completed_date DATE,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    combo_progress JSONB DEFAULT '{}',
    completion_history JSONB DEFAULT '[]',
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, child_id)
);

ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own task_progress" ON task_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own task_progress" ON task_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own task_progress" ON task_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own task_progress" ON task_progress FOR DELETE USING (auth.uid() = user_id);

-- 3. task_completions 表
CREATE TABLE IF NOT EXISTS task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    progress_id UUID REFERENCES task_progress(id) ON DELETE CASCADE,
    completion_date DATE NOT NULL,
    completion_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_earned NUMERIC DEFAULT 0,
    triggered_by_rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own task_completions" ON task_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own task_completions" ON task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own task_completions" ON task_completions FOR DELETE USING (auth.uid() = user_id);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_task_progress_task_child ON task_progress(task_id, child_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_status ON task_progress(status);
CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_child ON task_completions(task_id, child_id);

-- 5. 触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_task_progress_updated_at ON task_progress;
CREATE TRIGGER update_task_progress_updated_at
    BEFORE UPDATE ON task_progress
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 6. 核心函数：check_task_progress
CREATE OR REPLACE FUNCTION check_task_progress(
    p_child_id UUID,
    p_rule_id UUID,
    p_check_date DATE DEFAULT CURRENT_DATE
)
RETURNS TABLE (
    task_id UUID,
    task_title TEXT,
    progress_changed BOOLEAN,
    new_status TEXT,
    points_to_award NUMERIC,
    message TEXT
) AS $$
DECLARE
    v_task RECORD;
    v_progress RECORD;
    v_is_completed BOOLEAN := false;
    v_combo_completed BOOLEAN := true;
    v_rule_id UUID;
    v_combo_data JSONB;
    v_days_diff INTEGER;
BEGIN
    FOR v_task IN 
        SELECT t.*, tp.id as progress_id, tp.current_count, tp.streak_count, 
               tp.last_completed_date, tp.status as progress_status, tp.combo_progress
        FROM tasks t
        LEFT JOIN task_progress tp ON t.id = tp.task_id AND tp.child_id = p_child_id
        WHERE t.status = 'active'
          AND (
              (t.task_type IN ('single', 'continuous', 'cumulative') 
               AND (t.linked_rule_ids IS NULL OR array_length(t.linked_rule_ids, 1) IS NULL 
                    OR p_rule_id = ANY(t.linked_rule_ids)))
              OR (t.task_type = 'combo' AND p_rule_id = ANY(t.linked_rule_ids))
          )
          AND (t.cycle_end IS NULL OR t.cycle_end >= p_check_date)
    LOOP
        IF v_task.progress_id IS NULL THEN
            INSERT INTO task_progress (task_id, child_id, user_id, status, combo_progress)
            VALUES (v_task.id, p_child_id, v_task.user_id, 'active', '{}'::JSONB)
            RETURNING * INTO v_progress;
        ELSE
            SELECT * INTO v_progress FROM task_progress WHERE id = v_task.progress_id;
        END IF;
        
        CASE v_task.task_type
            WHEN 'single' THEN
                v_is_completed := true;
                UPDATE task_progress 
                SET current_count = 1, status = 'completed', last_completed_date = p_check_date
                WHERE id = v_progress.id;
                
            WHEN 'continuous' THEN
                IF v_progress.last_completed_date IS NOT NULL THEN
                    v_days_diff := p_check_date - v_progress.last_completed_date;
                    IF v_days_diff = 1 THEN
                        UPDATE task_progress 
                        SET streak_count = streak_count + 1,
                            current_count = current_count + 1,
                            last_completed_date = p_check_date
                        WHERE id = v_progress.id;
                    ELSIF v_days_diff > 1 THEN
                        UPDATE task_progress 
                        SET streak_count = 1,
                            current_count = 1,
                            last_completed_date = p_check_date
                        WHERE id = v_progress.id;
                    END IF;
                ELSE
                    UPDATE task_progress 
                    SET streak_count = 1,
                        current_count = 1,
                        last_completed_date = p_check_date,
                        first_completed_date = p_check_date
                    WHERE id = v_progress.id;
                END IF;
                
                SELECT streak_count INTO v_progress.streak_count FROM task_progress WHERE id = v_progress.id;
                IF v_progress.streak_count >= v_task.target_streak THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
                
            WHEN 'cumulative' THEN
                UPDATE task_progress 
                SET current_count = current_count + 1,
                    last_completed_date = p_check_date
                WHERE id = v_progress.id;
                
                SELECT current_count INTO v_progress.current_count FROM task_progress WHERE id = v_progress.id;
                IF v_progress.current_count >= v_task.target_count THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
                
            WHEN 'combo' THEN
                v_combo_data := COALESCE(v_progress.combo_progress, '{}'::JSONB);
                v_combo_data := jsonb_set(
                    v_combo_data,
                    ARRAY[p_rule_id::text],
                    jsonb_build_object('completed', true, 'date', p_check_date, 'time', NOW()),
                    true
                );
                
                FOREACH v_rule_id IN ARRAY v_task.linked_rule_ids
                LOOP
                    IF NOT (v_combo_data->v_rule_id::text->>'completed')::BOOLEAN THEN
                        v_combo_completed := false;
                        EXIT;
                    END IF;
                END LOOP;
                
                UPDATE task_progress 
                SET combo_progress = v_combo_data,
                    current_count = current_count + 1,
                    last_completed_date = p_check_date
                WHERE id = v_progress.id;
                
                IF v_combo_completed AND v_progress.last_completed_date != p_check_date THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
        END CASE;
        
        INSERT INTO task_completions (
            task_id, child_id, progress_id, completion_date, 
            triggered_by_rule_id, points_earned, user_id
        ) VALUES (
            v_task.id, p_child_id, v_progress.id, p_check_date,
            p_rule_id, CASE WHEN v_is_completed THEN v_task.reward_points ELSE 0 END, v_task.user_id
        );
        
        task_id := v_task.id;
        task_title := v_task.title;
        progress_changed := true;
        new_status := CASE WHEN v_is_completed THEN 'completed' ELSE 'active' END;
        points_to_award := CASE WHEN v_is_completed THEN v_task.reward_points ELSE 0 END;
        message := CASE 
            WHEN v_task.task_type = 'continuous' AND v_is_completed THEN '🎉 恭喜！连续任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_task.task_type = 'cumulative' AND v_is_completed THEN '🎉 恭喜！累计任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_task.task_type = 'combo' AND v_is_completed THEN '🎉 恭喜！组合任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_is_completed THEN '🎉 任务完成！获得 ' || v_task.reward_points || ' 积分'
            ELSE '✅ 进度已更新'
        END;
        RETURN NEXT;
    END LOOP;
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 7. 奖励发放函数
CREATE OR REPLACE FUNCTION award_task_reward(
    p_task_id UUID,
    p_child_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_progress RECORD;
BEGIN
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    SELECT * INTO v_progress FROM task_progress WHERE task_id = p_task_id AND child_id = p_child_id;
    
    IF v_progress.reward_claimed THEN
        RETURN jsonb_build_object('success', false, 'message', '奖励已发放过');
    END IF;
    
    IF v_progress.status != 'completed' THEN
        RETURN jsonb_build_object('success', false, 'message', '任务尚未完成');
    END IF;
    
    INSERT INTO transactions (child_id, task_id, points, type, note, user_id)
    VALUES (p_child_id, p_task_id, v_task.reward_points, 'earn', '完成任务奖励: ' || v_task.title, v_task.user_id);
    
    UPDATE children 
    SET total_points = total_points + v_task.reward_points,
        current_balance = current_balance + v_task.reward_points
    WHERE id = p_child_id;
    
    UPDATE task_progress 
    SET reward_claimed = true, reward_claimed_at = NOW()
    WHERE id = v_progress.id;
    
    RETURN jsonb_build_object('success', true, 'message', '奖励发放成功', 'points_awarded', v_task.reward_points);
END;
$$ LANGUAGE plpgsql;
