const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function testCurrentIssue() {
  try {
    console.log('🔍 测试当前期号查询...');
    
    // 模拟API查询逻辑
    const dataQuery = `
      SELECT 
        i.*,
        lt.name as lottery_name,
        ld.draw_numbers,
        ld.draw_method,
        0 as bet_count,
        0 as bet_amount,
        0 as win_amount,
        CASE 
          WHEN ld.draw_numbers IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as settlement_status
      FROM lottery_issues i
      JOIN lottery_types lt ON i.lottery_type_id = lt.id
      LEFT JOIN lottery_draws ld ON i.id = ld.issue_id
      WHERE i.lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      ORDER BY i.issue_date DESC, i.issue_index DESC
      LIMIT 1
    `;
    
    const result = await pool.query(dataQuery);
    
    if (result.rows.length > 0) {
      const issue = result.rows[0];
      console.log('✅ 找到当前期号:');
      console.log(`   期号: ${issue.issue_no}`);
      console.log(`   状态: ${issue.status}`);
      console.log(`   开奖时间: ${issue.draw_time}`);
      console.log(`   开奖号码: ${issue.draw_numbers || '未开奖'}`);
      console.log(`   结算状态: ${issue.settlement_status}`);
    } else {
      console.log('❌ 没有找到符合条件的期号');
      
      // 查看今日所有期号状态
      const allIssues = await pool.query(`
        SELECT issue_no, status, draw_time, 
               CASE WHEN draw_time > NOW() THEN '未到开奖时间' ELSE '已过开奖时间' END as time_status
        FROM lottery_issues 
        WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
          AND issue_date = CURRENT_DATE
        ORDER BY issue_index
        LIMIT 10
      `);
      
      console.log('📊 今日前10期状态:');
      allIssues.rows.forEach(issue => {
        console.log(`   ${issue.issue_no}: ${issue.status} (${issue.time_status})`);
      });
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  } finally {
    await pool.end();
  }
}

testCurrentIssue();
