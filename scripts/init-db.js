const { Client } = require('pg');

// Supabase 连接信息
const client = new Client({
  host: 'db.agkemugaxhrsnbyiluw.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: process.env.SUPABASE_DB_PASSWORD || '', // 需要数据库密码
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    await client.connect();
    console.log('✅ 数据库连接成功');
    
    // 创建 children 表
    await client.query(`
      CREATE TABLE IF NOT EXISTS children (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        avatar TEXT,
        total_points NUMERIC DEFAULT 0,
        current_balance NUMERIC DEFAULT 0,
        user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    console.log('✅ children 表创建成功');
    
    // 启用 RLS
    await client.query('ALTER TABLE children ENABLE ROW LEVEL SECURITY;');
    
    // 创建 RLS 策略
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own children" ON children
        FOR SELECT USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can insert their own children" ON children
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    console.log('✅ children RLS 策略创建成功');
    
    // 创建 rules 表
    await client.query(`
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
    `);
    console.log('✅ rules 表创建成功');
    
    await client.query('ALTER TABLE rules ENABLE ROW LEVEL SECURITY;');
    
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own rules" ON rules
        FOR SELECT USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can insert their own rules" ON rules
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    console.log('✅ rules RLS 策略创建成功');
    
    // 创建 transactions 表
    await client.query(`
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
    `);
    console.log('✅ transactions 表创建成功');
    
    await client.query('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own transactions" ON transactions
        FOR SELECT USING (auth.uid() = user_id);
    `);
    console.log('✅ transactions RLS 策略创建成功');
    
    console.log('🎉 数据库初始化完成！');
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await client.end();
  }
}

initDatabase();
