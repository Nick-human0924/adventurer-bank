-- ============================================
-- 智能任务系统数据库迁移脚本 (v2.0)
-- 从简单待办列表升级为智能任务系统
-- ============================================

-- 1. 任务表新增字段 - 支持多种任务类型
ALTER TABLE tasks 
ADD COLUMN IF NOT EXISTS task_type VARCHAR(20) DEFAULT 'single' 
  CHECK (task_type IN ('single', 'continuous', 'cumulative', 'combo')),
ADD COLUMN IF NOT EXISTS target_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS linked_rule_ids UUID[] DEFAULT ARRAY[]::UUID[],
ADD COLUMN IF NOT EXISTS cycle_start DATE,
ADD COLUMN IF NOT EXISTS cycle_end DATE,
ADD COLUMN IF NOT EXISTS reward_points NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_repeatable BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS target_streak INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS current_streak INTEGER DEFAULT 0;

-- 迁移现有数据：将旧type映射到新task_type
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
WHERE task_type IS NULL;

-- 2. 创建任务进度表 (核心新增表)
CREATE TABLE IF NOT EXISTS task_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    
    -- 进度统计
    current_count INTEGER DEFAULT 0,           -- 当前完成次数
    streak_count INTEGER DEFAULT 0,            -- 连续完成天数
    longest_streak INTEGER DEFAULT 0,          -- 最长连续记录
    
    -- 时间追踪
    last_completed_date DATE,                  -- 最后完成日期
    first_completed_date DATE,                 -- 首次完成日期
    
    -- 状态管理
    status VARCHAR(20) DEFAULT 'active' 
      CHECK (status IN ('active', 'completed', 'failed', 'expired')),
    
    -- 组合任务子项进度 (JSON格式存储各子项完成情况)
    combo_progress JSONB DEFAULT '{}',         -- {rule_id: {completed: bool, date: date}}
    
    -- 完成历史 (用于日历视图)
    completion_history JSONB DEFAULT '[]',     -- [{date: '2024-03-01', points: 5}, ...]
    
    -- 奖励发放记录
    reward_claimed BOOLEAN DEFAULT false,
    reward_claimed_at TIMESTAMP WITH TIME ZONE,
    
    -- 元数据
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- 唯一约束：每个孩子的每个任务只有一条进度记录
    UNIQUE(task_id, child_id)
);

-- 启用RLS
ALTER TABLE task_progress ENABLE ROW LEVEL SECURITY;

-- RLS策略
CREATE POLICY "Users can view their own task_progress" ON task_progress
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own task_progress" ON task_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own task_progress" ON task_progress
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own task_progress" ON task_progress
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. 创建任务完成记录表 (细粒度记录每次完成)
CREATE TABLE IF NOT EXISTS task_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID NOT NULL REFERENCES children(id) ON DELETE CASCADE,
    progress_id UUID REFERENCES task_progress(id) ON DELETE CASCADE,
    
    -- 完成详情
    completion_date DATE NOT NULL,
    completion_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    points_earned NUMERIC DEFAULT 0,
    
    -- 关联的行为规则 (如果是组合任务的子项)
    triggered_by_rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
    
    -- 备注
    note TEXT,
    
    -- 元数据
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用RLS
ALTER TABLE task_completions ENABLE ROW LEVEL SECURITY;

-- RLS策略
CREATE POLICY "Users can view their own task_completions" ON task_completions
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own task_completions" ON task_completions
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own task_completions" ON task_completions
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_task_progress_task_child ON task_progress(task_id, child_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_status ON task_progress(status);
CREATE INDEX IF NOT EXISTS idx_task_progress_user ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_date ON task_completions(completion_date);
CREATE INDEX IF NOT EXISTS idx_task_completions_task_child ON task_completions(task_id, child_id);

-- 5. 创建触发器：自动更新 updated_at
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

-- 6. 创建函数：检查任务进度 (核心业务逻辑)
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
    -- 查找关联此规则的所有活动任务
    FOR v_task IN 
        SELECT t.*, tp.id as progress_id, tp.current_count, tp.streak_count, 
               tp.last_completed_date, tp.status as progress_status, tp.combo_progress
        FROM tasks t
        LEFT JOIN task_progress tp ON t.id = tp.task_id AND tp.child_id = p_child_id
        WHERE t.status = 'active'
          AND (t.task_type = 'continuous' OR t.task_type = 'cumulative' 
               OR (t.task_type = 'combo' AND p_rule_id = ANY(t.linked_rule_ids)))
          AND (t.cycle_end IS NULL OR t.cycle_end >= p_check_date)
    LOOP
        -- 初始化或获取进度记录
        IF v_task.progress_id IS NULL THEN
            INSERT INTO task_progress (task_id, child_id, user_id, status, combo_progress)
            VALUES (v_task.id, p_child_id, v_task.user_id, 'active', 
                    CASE WHEN v_task.task_type = 'combo' THEN '{}' ELSE '{}'::JSONB END)
            RETURNING * INTO v_progress;
        ELSE
            SELECT * INTO v_progress FROM task_progress WHERE id = v_task.progress_id;
        END IF;
        
        -- 根据任务类型处理进度
        CASE v_task.task_type
            WHEN 'single' THEN
                -- 单次任务：直接标记完成
                v_is_completed := true;
                UPDATE task_progress 
                SET current_count = 1, status = 'completed', last_completed_date = p_check_date
                WHERE id = v_progress.id;
                
            WHEN 'continuous' THEN
                -- 连续任务：检查是否连续
                IF v_progress.last_completed_date IS NOT NULL THEN
                    v_days_diff := p_check_date - v_progress.last_completed_date;
                    
                    IF v_days_diff = 1 THEN
                        -- 连续完成
                        UPDATE task_progress 
                        SET streak_count = streak_count + 1,
                            current_count = current_count + 1,
                            last_completed_date = p_check_date
                        WHERE id = v_progress.id;
                    ELSIF v_days_diff > 1 THEN
                        -- 断连重置
                        UPDATE task_progress 
                        SET streak_count = 1,
                            current_count = 1,
                            last_completed_date = p_check_date
                        WHERE id = v_progress.id;
                    END IF;
                ELSE
                    -- 首次完成
                    UPDATE task_progress 
                    SET streak_count = 1,
                        current_count = 1,
                        last_completed_date = p_check_date,
                        first_completed_date = p_check_date
                    WHERE id = v_progress.id;
                END IF;
                
                -- 检查是否达成目标
                SELECT streak_count INTO v_progress.streak_count 
                FROM task_progress WHERE id = v_progress.id;
                
                IF v_progress.streak_count >= v_task.target_streak THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
                
            WHEN 'cumulative' THEN
                -- 累计任务：简单累加
                UPDATE task_progress 
                SET current_count = current_count + 1,
                    last_completed_date = p_check_date
                WHERE id = v_progress.id;
                
                SELECT current_count INTO v_progress.current_count 
                FROM task_progress WHERE id = v_progress.id;
                
                IF v_progress.current_count >= v_task.target_count THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
                
            WHEN 'combo' THEN
                -- 组合任务：检查所有子项
                v_combo_data := COALESCE(v_progress.combo_progress, '{}'::JSONB);
                
                -- 更新当前触发的子项
                v_combo_data := jsonb_set(
                    v_combo_data,
                    ARRAY[p_rule_id::text],
                    jsonb_build_object(
                        'completed', true,
                        'date', p_check_date,
                        'time', NOW()
                    ),
                    true
                );
                
                -- 检查是否所有子项都完成
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
                
                -- 如果是当天首次完成此组合任务
                IF v_combo_completed AND v_progress.last_completed_date != p_check_date THEN
                    v_is_completed := true;
                    UPDATE task_progress SET status = 'completed' WHERE id = v_progress.id;
                END IF;
        END CASE;
        
        -- 记录完成详情
        INSERT INTO task_completions (
            task_id, child_id, progress_id, completion_date, 
            triggered_by_rule_id, points_earned, user_id
        ) VALUES (
            v_task.id, p_child_id, v_progress.id, p_check_date,
            p_rule_id, 
            CASE WHEN v_is_completed THEN v_task.reward_points ELSE 0 END,
            v_task.user_id
        );
        
        -- 返回结果
        task_id := v_task.id;
        task_title := v_task.title;
        progress_changed := true;
        new_status := CASE WHEN v_is_completed THEN 'completed' ELSE 'active' END;
        points_to_award := CASE WHEN v_is_completed THEN v_task.reward_points ELSE 0 END;
        message := CASE 
            WHEN v_task.task_type = 'continuous' AND v_is_completed THEN 
                '🎉 恭喜！连续任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_task.task_type = 'cumulative' AND v_is_completed THEN
                '🎉 恭喜！累计任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_task.task_type = 'combo' AND v_is_completed THEN
                '🎉 恭喜！组合任务完成！获得 ' || v_task.reward_points || ' 积分'
            WHEN v_is_completed THEN
                '🎉 任务完成！获得 ' || v_task.reward_points || ' 积分'
            ELSE
                '✅ 进度已更新'
        END;
        
        RETURN NEXT;
    END LOOP;
    
    RETURN;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建函数：发放任务奖励
CREATE OR REPLACE FUNCTION award_task_reward(
    p_task_id UUID,
    p_child_id UUID
)
RETURNS JSONB AS $$
DECLARE
    v_task RECORD;
    v_progress RECORD;
    v_result JSONB;
BEGIN
    -- 获取任务信息
    SELECT * INTO v_task FROM tasks WHERE id = p_task_id;
    
    -- 获取进度信息
    SELECT * INTO v_progress 
    FROM task_progress 
    WHERE task_id = p_task_id AND child_id = p_child_id;
    
    -- 检查是否已发放
    IF v_progress.reward_claimed THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '奖励已发放过'
        );
    END IF;
    
    -- 检查任务是否完成
    IF v_progress.status != 'completed' THEN
        RETURN jsonb_build_object(
            'success', false,
            'message', '任务尚未完成'
        );
    END IF;
    
    -- 创建交易记录
    INSERT INTO transactions (child_id, task_id, points, type, note, user_id)
    VALUES (
        p_child_id, p_task_id, v_task.reward_points, 'earn',
        '完成任务奖励: ' || v_task.title, v_task.user_id
    );
    
    -- 更新孩子的积分
    UPDATE children 
    SET total_points = total_points + v_task.reward_points,
        current_balance = current_balance + v_task.reward_points
    WHERE id = p_child_id;
    
    -- 标记奖励已发放
    UPDATE task_progress 
    SET reward_claimed = true, reward_claimed_at = NOW()
    WHERE id = v_progress.id;
    
    RETURN jsonb_build_object(
        'success', true,
        'message', '奖励发放成功',
        'points_awarded', v_task.reward_points
    );
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- 测试数据：超级周挑战
-- ============================================

-- 先创建测试用的规则 (如果还没有)
INSERT INTO rules (name, description, points, type, icon) VALUES
('阅读时光', '每天阅读至少30分钟', 5, 'good', '📚'),
('钢琴练习', '每天练习钢琴20分钟', 5, 'good', '🎹')
ON CONFLICT DO NOTHING;

-- 创建组合任务示例 (需要在应用启动后执行，因为需要实际的规则ID)
-- 注：以下INSERT语句需要在知道实际rule_id后执行
/*
INSERT INTO tasks (
    title, description, task_type, target_count, 
    linked_rule_ids, cycle_start, cycle_end, 
    reward_points, icon, status, points
) VALUES (
    '超级周挑战',
    '每天完成阅读和钢琴练习，坚持一周！',
    'combo',
    7,
    ARRAY['阅读规则的UUID', '钢琴规则的UUID'],
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '7 days',
    50,
    '🏆',
    'active',
    50
);
*/

-- ============================================
-- 迁移完成！
-- ============================================
