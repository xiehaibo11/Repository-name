const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management_clean',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function checkSSCData() {
  try {
    console.log('🔍 检查SSC数据...');

    // 检查开奖记录
    const drawsResult = await pool.query(`
      SELECT issue_no, draw_time, wan_number, qian_number, bai_number, shi_number, ge_number, 
             sum_value, sum_big_small, sum_odd_even, dragon_tiger
      FROM ssc_draw_results 
      ORDER BY draw_time DESC 
      LIMIT 5
    `);

    console.log('\n🎲 最新开奖记录:');
    if (drawsResult.rows.length === 0) {
      console.log('  ❌ 没有开奖记录');
    } else {
      drawsResult.rows.forEach(row => {
        const numbers = `${row.wan_number}${row.qian_number}${row.bai_number}${row.shi_number}${row.ge_number}`;
        console.log(`  🎯 ${row.issue_no}: ${numbers} (和值:${row.sum_value}/${row.sum_big_small}/${row.sum_odd_even}, 龙虎:${row.dragon_tiger})`);
      });
    }

    // 检查赔率配置
    const oddsResult = await pool.query('SELECT COUNT(*) FROM ssc_odds_config');
    console.log(`\n💰 赔率配置: ${oddsResult.rows[0].count} 条`);

    // 检查系统配置
    const configResult = await pool.query('SELECT config_key, config_value FROM ssc_system_config');
    console.log('\n⚙️ 系统配置:');
    configResult.rows.forEach(row => {
      console.log(`  ${row.config_key}: ${row.config_value}`);
    });

    // 检查投注记录
    const betsResult = await pool.query('SELECT COUNT(*) FROM ssc_bet_orders');
    console.log(`\n📝 投注订单: ${betsResult.rows[0].count} 条`);

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkSSCData();
