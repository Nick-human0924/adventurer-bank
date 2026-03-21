const { Client } = require('pg');

// 使用 Transaction 模式 (端口 6543) 配合 project ref
const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.agkemugaxhrsnbyiluw',
  password: 'skn@Betterday1',
  ssl: { rejectUnauthorized: false }
});

async function initDatabase() {
  try {
    console.log('正在连接数据库...');
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
    console.log('✅ children 表已创建');
    
    await client.query('ALTER TABLE children ENABLE ROW LEVEL SECURITY;');
    
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own children" ON children
        FOR SELECT USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can insert their own children" ON children
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can update their own children" ON children
        FOR UPDATE USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can delete their own children" ON children
        FOR DELETE USING (auth.uid() = user_id);
    `);
    console.log('✅ children RLS 策略已创建');
    
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
    console.log('✅ rules 表已创建');
    
    await client.query('ALTER TABLE rules ENABLE ROW LEVEL SECURITY;');
    
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own rules" ON rules
        FOR SELECT USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can insert their own rules" ON rules
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can update their own rules" ON rules
        FOR UPDATE USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can delete their own rules" ON rules
        FOR DELETE USING (auth.uid() = user_id);
    `);
    console.log('✅ rules RLS 策略已创建');
    
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
    console.log('✅ transactions 表已创建');
    
    await client.query('ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;');
    
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can view their own transactions" ON transactions
        FOR SELECT USING (auth.uid() = user_id);
    `);
    await client.query(`
      CREATE POLICY IF NOT EXISTS "Users can insert their own transactions" ON transactions
        FOR INSERT WITH CHECK (auth.uid() = user_id);
    `);
    console.log('✅ transactions RLS 策略已创建');
    
    console.log('\n🎉 数据库初始化完成！所有表已创建');
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
    if (err.message.includes('Tenant or user not found')) {
      console.log('\n💡 提示：用户名格式可能需要调整为 postgres.[project-ref]');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

initDatabase();
