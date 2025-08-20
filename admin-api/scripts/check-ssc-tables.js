const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function checkSSCTables() {
  try {
    console.log('🔍 检查分分时时彩数据库表...');
    console.log('数据库配置:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'backend_management',
      user: process.env.DB_USER || 'postgres'
    });

    // 检查所有表
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ssc_%'
      ORDER BY table_name
    `);

    console.log('\n📊 找到的SSC相关表:');
    if (tablesResult.rows.length === 0) {
      console.log('❌ 没有找到任何SSC相关表');
    } else {
      tablesResult.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }

    // 检查每个表的记录数
    const expectedTables = [
      'ssc_draw_results',
      'ssc_bet_orders', 
      'ssc_bet_items',
      'ssc_odds_config',
      'ssc_system_config'
    ];

    console.log('\n📈 表记录统计:');
    for (const tableName of expectedTables) {
      try {
        const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
        console.log(`  📊 ${tableName}: ${countResult.rows[0].count} 条记录`);
      } catch (error) {
        console.log(`  ❌ ${tableName}: 表不存在或查询失败`);
      }
    }

    // 检查赔率配置
    try {
      const oddsResult = await pool.query('SELECT game_type, bet_type, odds FROM ssc_odds_config LIMIT 5');
      console.log('\n💰 赔率配置示例:');
      oddsResult.rows.forEach(row => {
        console.log(`  ${row.game_type} - ${row.bet_type}: ${row.odds}`);
      });
    } catch (error) {
      console.log('\n❌ 无法查询赔率配置:', error.message);
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkSSCTables();
