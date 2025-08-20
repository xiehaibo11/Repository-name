const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkAndInitDatabase() {
  try {
    console.log('🔍 检查数据库连接...');
    await pool.query('SELECT NOW()');
    console.log('✅ 数据库连接成功');

    // 检查表是否存在
    const tables = ['lottery_types', 'lottery_issues', 'lottery_draws'];
    
    for (const table of tables) {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ 表 ${table} 存在`);
      } else {
        console.log(`❌ 表 ${table} 不存在`);
      }
    }

    // 检查分分时时彩彩种是否存在
    const sscCheck = await pool.query(`
      SELECT id, name, code FROM lottery_types WHERE code = 'ssc'
    `);
    
    if (sscCheck.rows.length > 0) {
      console.log('✅ 分分时时彩彩种存在:', sscCheck.rows[0]);
    } else {
      console.log('❌ 分分时时彩彩种不存在');
    }

    // 检查是否有奖期数据
    const issueCheck = await pool.query(`
      SELECT COUNT(*) as count FROM lottery_issues
    `);
    
    console.log(`📊 当前奖期数量: ${issueCheck.rows[0].count}`);

    // 如果没有数据，提供初始化建议
    if (parseInt(issueCheck.rows[0].count) === 0) {
      console.log('💡 建议执行以下操作:');
      console.log('1. 运行数据库迁移: npm run migrate');
      console.log('2. 初始化分分时时彩: psql -d lottery_system -f scripts/init-ssc-lottery.sql');
      console.log('3. 生成今日期号: 在管理后台点击"生成今日期号"');
    }

  } catch (error) {
    console.error('❌ 数据库检查失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkAndInitDatabase();
