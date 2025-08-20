const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function cleanupSSCData() {
  try {
    console.log('🧹 开始清理分分时时彩相关数据...');

    // 1. 删除旧的分分时时彩相关表
    const tablesToDrop = [
      'ssc_lottery_results_archive',
      'ssc_cleanup_history', 
      'lottery_issues',
      'lottery_draws'
    ];

    for (const table of tablesToDrop) {
      try {
        await pool.query(`DROP TABLE IF EXISTS ${table} CASCADE`);
        console.log(`✅ 删除表: ${table}`);
      } catch (error) {
        console.log(`⚠️ 表 ${table} 不存在或删除失败:`, error.message);
      }
    }

    // 2. 删除旧的彩种记录
    try {
      const result = await pool.query("DELETE FROM lottery_types WHERE code = 'ssc'");
      console.log(`✅ 删除SSC彩种记录: ${result.rowCount} 条`);
    } catch (error) {
      console.log('⚠️ 删除SSC彩种记录失败:', error.message);
    }

    // 3. 删除相关的系统配置
    try {
      const result = await pool.query("DELETE FROM system_config WHERE config_key LIKE 'ssc_%'");
      console.log(`✅ 删除SSC系统配置: ${result.rowCount} 条`);
    } catch (error) {
      console.log('⚠️ 删除SSC系统配置失败:', error.message);
    }

    // 4. 删除相关的清理函数
    const functionsToDrop = [
      'cleanup_old_lottery_results(integer, boolean)',
      'get_lottery_results_stats()',
      'get_lottery_results_summary(date)',
      'check_lottery_data_integrity()'
    ];

    for (const func of functionsToDrop) {
      try {
        await pool.query(`DROP FUNCTION IF EXISTS ${func}`);
        console.log(`✅ 删除函数: ${func}`);
      } catch (error) {
        console.log(`⚠️ 函数 ${func} 不存在或删除失败:`, error.message);
      }
    }

    console.log('🎉 分分时时彩数据清理完成!');

  } catch (error) {
    console.error('❌ 清理过程中发生错误:', error);
  } finally {
    await pool.end();
  }
}

cleanupSSCData();
