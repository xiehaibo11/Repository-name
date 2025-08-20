const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function createSSCTables() {
  try {
    console.log('🏗️ 开始创建分分时时彩数据库表...');

    // 读取SQL文件
    const sqlFile = path.join(__dirname, '../sql/create-ssc-tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // 执行SQL
    await pool.query(sql);

    console.log('🎉 分分时时彩数据库表创建完成!');
    console.log('📊 已创建的表:');
    console.log('  - ssc_draw_results (开奖结果表)');
    console.log('  - ssc_bet_orders (投注订单表)');
    console.log('  - ssc_bet_items (投注明细表)');
    console.log('  - ssc_odds_config (赔率配置表)');
    console.log('  - ssc_system_config (系统配置表)');
    console.log('💰 已插入默认赔率配置');
    console.log('⚙️ 已插入系统配置');

  } catch (error) {
    console.error('❌ 创建数据库表失败:', error);
  } finally {
    await pool.end();
  }
}

createSSCTables();
