const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function checkDatabase() {
  try {
    console.log('🔍 检查数据库表结构...');

    // 1. 检查 lottery_issues 表结构
    const issuesStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lottery_issues'
      ORDER BY ordinal_position;
    `);

    console.log('\n📋 lottery_issues 表结构:');
    console.table(issuesStructure.rows);

    // 2. 检查 lottery_draws 表结构
    const drawsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lottery_draws'
      ORDER BY ordinal_position;
    `);

    console.log('\n🎯 lottery_draws 表结构:');
    console.table(drawsStructure.rows);

    // 3. 检查 lottery_logs 表结构
    const logsStructure = await pool.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns
      WHERE table_name = 'lottery_logs'
      ORDER BY ordinal_position;
    `);

    console.log('\n📝 lottery_logs 表结构:');
    console.table(logsStructure.rows);

    // 4. 检查最新的期号记录
    const latestIssues = await pool.query(`
      SELECT id, lottery_type_id, issue_no, issue_date, issue_index, start_time, end_time, status, created_at
      FROM lottery_issues
      WHERE lottery_type_id = 1
      ORDER BY created_at DESC
      LIMIT 5;
    `);

    console.log('\n📊 最新的5条期号记录:');
    console.table(latestIssues.rows);

    // 5. 检查开奖记录
    const latestDraws = await pool.query(`
      SELECT ld.*, li.issue_no, li.status as issue_status
      FROM lottery_draws ld
      LEFT JOIN lottery_issues li ON ld.issue_id = li.id
      WHERE li.lottery_type_id = 1
      ORDER BY ld.created_at DESC
      LIMIT 5;
    `);

    console.log('\n🎲 最新的5条开奖记录:');
    console.table(latestDraws.rows);

    // 6. 检查数据一致性
    const consistencyCheck = await pool.query(`
      SELECT
        COUNT(CASE WHEN li.status = 'pending' THEN 1 END) as pending_issues,
        COUNT(CASE WHEN li.status = 'drawn' THEN 1 END) as drawn_issues,
        COUNT(ld.id) as draw_records,
        COUNT(CASE WHEN li.status = 'drawn' AND ld.id IS NULL THEN 1 END) as missing_draws
      FROM lottery_issues li
      LEFT JOIN lottery_draws ld ON li.id = ld.issue_id
      WHERE li.lottery_type_id = 1;
    `);

    console.log('\n🔍 数据一致性检查:');
    console.table(consistencyCheck.rows);

  } catch (error) {
    console.error('❌ 数据库检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkDatabase();
