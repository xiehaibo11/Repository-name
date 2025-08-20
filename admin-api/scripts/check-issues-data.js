const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkIssuesData() {
  try {
    console.log('🔍 检查期号数据...');
    
    // 检查今日期号
    const todayCheck = await pool.query(`
      SELECT COUNT(*) as count, MIN(issue_no) as first, MAX(issue_no) as last
      FROM lottery_issues 
      WHERE issue_date = CURRENT_DATE
    `);
    
    console.log('📊 今日期号统计:', todayCheck.rows[0]);
    
    // 检查最近的期号
    const recentIssues = await pool.query(`
      SELECT issue_no, issue_date, status, draw_time
      FROM lottery_issues 
      ORDER BY issue_date DESC, issue_index DESC
      LIMIT 5
    `);
    
    console.log('📋 最近5期数据:');
    recentIssues.rows.forEach(issue => {
      console.log(`   ${issue.issue_no} | ${issue.issue_date} | ${issue.status} | ${issue.draw_time}`);
    });
    
    // 检查当前日期
    const currentDate = await pool.query('SELECT CURRENT_DATE, NOW()');
    console.log('🕐 当前数据库时间:', currentDate.rows[0]);
    
  } catch (error) {
    console.error('❌ 检查失败:', error.message);
  } finally {
    await pool.end();
  }
}

checkIssuesData();
