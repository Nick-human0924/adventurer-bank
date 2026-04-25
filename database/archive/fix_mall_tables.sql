-- ============================================
-- 修复商品兑换系统 - 创建 prizes 和 orders 表
-- ============================================

-- 1. 创建 prizes 表 (奖品表)
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

-- 启用 RLS
ALTER TABLE prizes ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own prizes" ON prizes
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own prizes" ON prizes
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prizes" ON prizes
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prizes" ON prizes
    FOR DELETE USING (auth.uid() = user_id);

-- 2. 创建 orders 表 (订单表)
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

-- 启用 RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own orders" ON orders
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own orders" ON orders
    FOR DELETE USING (auth.uid() = user_id);

-- 3. 创建索引优化查询
CREATE INDEX IF NOT EXISTS idx_orders_child_id ON orders(child_id);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_prizes_user_id ON prizes(user_id);

-- 4. 给 children 表添加 gem_balance 列（如果不存在）
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'children' AND column_name = 'gem_balance'
    ) THEN
        ALTER TABLE children ADD COLUMN gem_balance NUMERIC DEFAULT 0;
    END IF;
END $$;

-- 5. 创建 gem_transactions 表（宝石交易记录）
CREATE TABLE IF NOT EXISTS gem_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    child_id UUID REFERENCES children(id) ON DELETE CASCADE,
    gems NUMERIC NOT NULL,
    type TEXT CHECK (type IN ('earn', 'spend')) NOT NULL,
    note TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 启用 RLS
ALTER TABLE gem_transactions ENABLE ROW LEVEL SECURITY;

-- RLS 策略
CREATE POLICY "Users can view their own gem_transactions" ON gem_transactions
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own gem_transactions" ON gem_transactions
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own gem_transactions" ON gem_transactions
    FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 修复完成！
-- ============================================
