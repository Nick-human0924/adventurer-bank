const { Client } = require('pg');

const client = new Client({
  host: 'aws-0-ap-southeast-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.agkemugaxhrsnbyiluw',
  password: 'skn@Betterday1',
  ssl: { rejectUnauthorized: false }
});

async function fix() {
  try {
    await client.connect();
    console.log('✅ 连接成功');
    
    // 禁用 RLS
    await client.query('ALTER TABLE children DISABLE ROW LEVEL SECURITY;');
    console.log('✅ 已禁用 children RLS');
    
    await client.query('ALTER TABLE rules DISABLE ROW LEVEL SECURITY;');
    console.log('✅ 已禁用 rules RLS');
    
    await client.query('ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;');
    console.log('✅ 已禁用 transactions RLS');
    
    // 添加孩子
    await client.query(`
      INSERT INTO children (name, avatar, total_points, current_balance, created_at)
      VALUES ('申安哲', '👶', 0, 0, NOW())
      ON CONFLICT DO NOTHING;
    `);
    console.log('✅ 已添加孩子：申安哲');
    
    // 查看结果
    const result = await client.query('SELECT * FROM children;');
    console.log('\n📋 当前孩子列表：');
    result.rows.forEach(row => {
      console.log(`  - ${row.name}: ${row.current_balance}分`);
    });
    
  } catch (err) {
    console.error('❌ 错误:', err.message);
  } finally {
    await client.end();
  }
}

fix();
