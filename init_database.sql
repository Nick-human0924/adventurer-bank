-- ============================================
-- 冒险家银行数据库初始化脚本
-- 在 Supabase SQL Editor 中运行此脚本
-- ============================================

-- 1. 创建 children 表 (孩子信息表)
CREATE TABLE IF NOT EXISTS children (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    avatar TEXT,
    total_points NUMERIC DEFAULT 0,
    current_balance NUMERIC DEFAULT 0,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE children ENABLE ROW LEVEL SECURITY;

-- RLS 策略：用户只能查看/操作自己的孩子
CREATE POLICY "Users can view their own children" ON children
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own children" ON children
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own children" ON children
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own children" ON children
    FOR DELETE USING (auth.uid() = user_id);

-- 2. 创建 rules 表 (行为规则表)
CREATE TABLE IF NOT EXISTS rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    points NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('good', 'bad')) DEFAULT 'good',
    icon TEXT DEFAULT '⭐',
    is_active BOOLEAN DEFAULT true,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE rules ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own rules" ON rules
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own rules" ON rules
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rules" ON rules
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rules" ON rules
    FOR DELETE USING (auth.uid() = user_id);

-- 3. 创建 transactions 表 (交易记录表)
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

-- 启用 RLS
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own transactions" ON transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own transactions" ON transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 4. 创建 tasks 表 (任务表)
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT,
    points NUMERIC NOT NULL DEFAULT 5,
    type TEXT CHECK (type IN ('daily', 'challenge', 'streak')) DEFAULT 'daily',
    icon TEXT DEFAULT '📋',
    status TEXT CHECK (status IN ('active', 'completed', 'cancelled')) DEFAULT 'active',
    -- 挑战任务特有字段
    duration_days INTEGER DEFAULT 1,  -- 挑战持续天数（如7天）
    start_date DATE,                  -- 挑战开始日期
    end_date DATE,                    -- 挑战结束日期
    required_completions INTEGER DEFAULT 1,  -- 需要完成多少次才算完成
    due_date DATE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 启用 RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own tasks" ON tasks
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own tasks" ON tasks
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own tasks" ON tasks
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own tasks" ON tasks
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 5. 创建 task_assignments 表 (任务分配表)
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

-- 启用 RLS
ALTER TABLE task_assignments ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own task_assignments" ON task_assignments
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own task_assignments" ON task_assignments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own task_assignments" ON task_assignments
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own task_assignments" ON task_assignments
    FOR DELETE USING (auth.uid() = user_id);

-- 6. 创建 challenge_progress 表 (挑战进度表 - 记录每天的完成情况)
CREATE TABLE IF NOT EXISTS challenge_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    day_number INTEGER NOT NULL,  -- 第几天（1, 2, 3...）
    progress_date DATE NOT NULL,  -- 具体日期
    completed BOOLEAN DEFAULT false,
    completed_at TIMESTAMP WITH TIME ZONE,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(task_id, child_id, progress_date)
);

-- 启用 RLS
ALTER TABLE challenge_progress ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own challenge_progress" ON challenge_progress
    FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own challenge_progress" ON challenge_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update their own challenge_progress" ON challenge_progress
    FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete their own challenge_progress" ON challenge_progress
    FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 7. 插入示例规则 (可选)
INSERT INTO rules (name, description, points, type, icon, user_id) VALUES
('按时起床', '早上7点前起床', 5, 'good', '☀️', NULL),
('完成作业', '按时完成学校作业', 10, 'good', '📝', NULL),
('整理房间', '保持房间整洁', 5, 'good', '🧹', NULL),
('阅读30分钟', '每天阅读至少30分钟', 8, 'good', '📚', NULL),
('帮助家务', '主动帮助做家务', 5, 'good', '🤝', NULL)
ON CONFLICT DO NOTHING;

-- ============================================
-- 脚本执行完成！
-- 现在可以开始使用冒险家银行系统了
-- ============================================
