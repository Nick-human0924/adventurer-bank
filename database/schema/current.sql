-- ============================================
-- 001_init_core.sql
-- 核心表结构初始化
-- 包含：children, rules, transactions, tasks, task_assignments, challenge_progress
-- ============================================

-- 1. children 表
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar TEXT,
    total_points NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    gem_balance NUMERIC DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE children ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own children" ON children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own children" ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own children" ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own children" ON children FOR DELETE USING (auth.uid() = user_id);

-- 2. rules 表
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('good', 'bad')) DEFAULT 'good',
    icon TEXT DEFAULT '⭐',
    icon_emoji TEXT DEFAULT '⭐',
    category TEXT DEFAULT 'other',
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own rules" ON rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own rules" ON rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own rules" ON rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own rules" ON rules FOR DELETE USING (auth.uid() = user_id);

-- 3. transactions 表
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    rule_id UUID REFERENCES rules(id) ON DELETE SET NULL,
    task_id UUID REFERENCES tasks(id) ON DELETE SET NULL,
    points NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('earn', 'spend')) NOT NULL,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

-- 4. tasks 表
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points NUMERIC NOT NULL DEFAULT 5,
    type TEXT CHECK (type IN ('daily', 'challenge', 'streak')) DEFAULT 'daily',
    icon TEXT DEFAULT '📋',
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    duration_days INTEGER DEFAULT 1,
    start_date DATE,
    end_date DATE,
    required_completions INTEGER DEFAULT 1,
    due_date DATE,
    task_type VARCHAR(20) DEFAULT 'single' CHECK (task_type IN ('single', 'continuous', 'cumulative', 'combo')),
    target_count INTEGER DEFAULT 1,
    linked_rule_ids UUID[] DEFAULT ARRAY[]::UUID[],
    cycle_start DATE,
    cycle_end DATE,
    reward_points NUMERIC DEFAULT 0,
    is_repeatable BOOLEAN DEFAULT false,
    target_streak INTEGER DEFAULT 0,
    current_streak INTEGER DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

-- 5. task_assignments 表
CREATE TABLE IF NOT EXISTS task_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, child_id)
);

ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own task_assignments" ON task_assignments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own task_assignments" ON task_assignments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own task_assignments" ON task_assignments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own task_assignments" ON task_assignments FOR DELETE USING (auth.uid() = user_id);

-- 6. challenge_progress 表
CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,
    progress_date DATE NOT NULL,
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, child_id, progress_date)
);

ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own challenge_progress" ON challenge_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own challenge_progress" ON challenge_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own challenge_progress" ON challenge_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own challenge_progress" ON challenge_progress FOR DELETE USING (auth.uid() = user_id);
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
-- ============================================
-- 004_multi_family.sql
-- 多家庭账号体系：统一 user_id 关联 + RLS + 自动填充触发器
-- ============================================

-- 1. 为所有业务表安全添加 user_id
DO $$
BEGIN
  FOR t_name IN 
    SELECT t.tablename 
    FROM pg_tables t 
    WHERE t.schemaname = 'public' 
      AND t.tablename IN ('children','rules','tasks','transactions','task_progress','task_completions','challenge_progress','task_assignments')
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = t_name.tablename AND column_name = 'user_id'
    ) THEN
      EXECUTE format('ALTER TABLE %I ADD COLUMN user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE', t_name.tablename);
    END IF;
  END LOOP;
END $$;

-- 2. 家庭设置表
CREATE TABLE IF NOT EXISTS family_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  family_name VARCHAR(100) DEFAULT '我的家庭',
  currency_name VARCHAR(20) DEFAULT '积分',
  theme VARCHAR(20) DEFAULT 'default',
  allow_child_login BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE family_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own settings" ON family_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own settings" ON family_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own settings" ON family_settings FOR UPDATE USING (auth.uid() = user_id);

-- 3. 统一启用 RLS（可重复执行）
DO $$
DECLARE
    t_name TEXT;
BEGIN
    FOR t_name IN 
        SELECT tablename FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('children','rules','tasks','transactions','task_progress','task_completions','prizes','orders','gem_transactions','family_settings','badges','child_badges')
    LOOP
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t_name);
    END LOOP;
END $$;

-- 4. 清理并重建统一的 RLS 策略
DO $$
DECLARE
    t TEXT;
    old_policies TEXT[];
    p TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['children','rules','tasks','transactions','task_progress','task_completions','family_settings'])
    LOOP
        FOR p IN SELECT policyname FROM pg_policies WHERE tablename = t
        LOOP
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I', p, t);
        END LOOP;
    END LOOP;
END $$;

CREATE POLICY "Users can only see their own children" ON children FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own children" ON children FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own children" ON children FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own children" ON children FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own rules" ON rules FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own rules" ON rules FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own rules" ON rules FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own rules" ON rules FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own tasks" ON tasks FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own tasks" ON tasks FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own tasks" ON tasks FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own tasks" ON tasks FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own transactions" ON transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own transactions" ON transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own transactions" ON transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own transactions" ON transactions FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own task progress" ON task_progress FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own task progress" ON task_progress FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only update their own task progress" ON task_progress FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own task progress" ON task_progress FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can only see their own completions" ON task_completions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can only insert their own completions" ON task_completions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can only delete their own completions" ON task_completions FOR DELETE USING (auth.uid() = user_id);

-- 5. 索引
CREATE INDEX IF NOT EXISTS idx_children_user_id ON children(user_id);
CREATE INDEX IF NOT EXISTS idx_rules_user_id ON rules(user_id);
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_task_progress_user_id ON task_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_task_completions_user_id ON task_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_child_id ON transactions(child_id);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- 6. 自动填充 user_id 触发器
CREATE OR REPLACE FUNCTION set_user_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.user_id = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DO $$
DECLARE
    t TEXT;
BEGIN
    FOR t IN SELECT unnest(ARRAY['children','rules','tasks','transactions','task_progress','task_completions'])
    LOOP
        EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_user_id ON %I', t, t);
        EXECUTE format('CREATE TRIGGER trg_%I_user_id BEFORE INSERT ON %I FOR EACH ROW EXECUTE FUNCTION set_user_id()', t, t);
    END LOOP;
END $$;
-- ============================================
-- 005_mall_tables.sql
-- 商城兑换系统：prizes + orders + gem_transactions
-- ============================================

-- 1. prizes 表
CREATE TABLE IF NOT EXISTS prizes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    price NUMERIC NOT NULL DEFAULT 0,
    price_type TEXT CHECK (price_type IN ('coins', 'gems')) DEFAULT 'coins',
    stock INTEGER DEFAULT 0,
    image TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own prizes" ON prizes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own prizes" ON prizes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own prizes" ON prizes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own prizes" ON prizes FOR DELETE USING (auth.uid() = user_id);

-- 2. orders 表
CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    prize_id UUID REFERENCES prizes(id) ON DELETE SET NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    price_type TEXT CHECK (price_type IN ('coins', 'gems')) DEFAULT 'coins',
    quantity INTEGER DEFAULT 1,
    message TEXT,
    status TEXT CHECK (status IN ('pending', 'completed', 'cancelled')) DEFAULT 'completed',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own orders" ON orders FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own orders" ON orders FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can update their own orders" ON orders FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own orders" ON orders FOR DELETE USING (auth.uid() = user_id);

-- 3. gem_transactions 表
CREATE TABLE IF NOT EXISTS gem_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    gems NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('earn', 'spend')) NOT NULL,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view their own gem_transactions" ON gem_transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can insert their own gem_transactions" ON gem_transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY IF NOT EXISTS "Users can delete their own gem_transactions" ON gem_transactions FOR DELETE USING (auth.uid() = user_id);

-- 4. 索引
CREATE INDEX IF NOT EXISTS idx_orders_child_id ON orders(child_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_prizes_user_id ON prizes(user_id);
-- ============================================
-- 006_badges_system.sql
-- 徽章系统：badges + child_badges
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  icon TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL CHECK (category IN ('milestone', 'streak', 'category', 'special')),
  tier TEXT CHECK (tier IN ('bronze', 'silver', 'gold', 'diamond')),
  unlock_condition JSONB NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_badges_category ON badges(category);
CREATE INDEX IF NOT EXISTS idx_badges_active ON badges(is_active);

CREATE TABLE IF NOT EXISTS child_badges (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  child_id UUID REFERENCES children(id) ON DELETE CASCADE,
  badge_id UUID REFERENCES badges(id) ON DELETE CASCADE,
  unlocked_at TIMESTAMPTZ DEFAULT NOW(),
  is_new BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(child_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_child_badges_child ON child_badges(child_id);
CREATE INDEX IF NOT EXISTS idx_child_badges_new ON child_badges(child_id, is_new) WHERE is_new = true;

ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE child_badges ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "Users can view badges" ON badges FOR SELECT TO authenticated USING (true);
CREATE POLICY IF NOT EXISTS "Users can view child badges" ON child_badges FOR SELECT USING (EXISTS (SELECT 1 FROM children WHERE children.id = child_badges.child_id AND children.user_id = auth.uid()));

DROP TRIGGER IF EXISTS update_badges_updated_at ON badges;
CREATE TRIGGER update_badges_updated_at
  BEFORE UPDATE ON badges
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
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
