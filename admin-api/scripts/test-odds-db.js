const { getPool } = require('../dist/config/database');

async function testOddsDB() {
  try {
    console.log('🔍 测试赔率数据库连接...');
    
    const pool = getPool();
    const client = await pool.connect();
    
    // 测试查询
    const result = await client.query('SELECT game_type, bet_type, odds FROM ssc_odds_config LIMIT 5');
    
    console.log('✅ 查询成功，找到赔率配置:');
    result.rows.forEach(row => {
      console.log(`  ${row.game_type} - ${row.bet_type}: ${row.odds}`);
    });
    
    client.release();
    await pool.end();
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

testOddsDB();
