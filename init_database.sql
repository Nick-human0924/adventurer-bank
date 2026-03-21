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

-- 4. 插入示例规则 (可选)
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
