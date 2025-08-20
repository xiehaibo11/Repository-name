const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function createTestIssue() {
  try {
    console.log('🔍 创建测试期号...');
    
    // 创建一个3分钟后开奖的测试期号
    const now = new Date();
    const drawTime = new Date(now.getTime() + 3 * 60 * 1000); // 3分钟后
    const startTime = new Date(now.getTime() - 30 * 1000); // 30秒前开始
    const endTime = new Date(drawTime.getTime() - 10 * 1000); // 开奖前10秒截止
    
    const today = now.toISOString().split('T')[0];
    const issueNo = `${today.replace(/-/g, '')}TEST`;
    
    // 删除已存在的测试期号
    await pool.query(`
      DELETE FROM lottery_issues 
      WHERE issue_no LIKE '%TEST%'
    `);
    
    // 插入新的测试期号
    const insertQuery = `
      INSERT INTO lottery_issues (
        lottery_type_id,
        issue_no,
        issue_date,
        issue_index,
        start_time,
        end_time,
        draw_time,
        status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    
    const result = await pool.query(insertQuery, [
      1, // 分分时时彩 ID
      issueNo,
      today,
      9999, // 使用一个很大的索引确保排在最前面
      startTime.toISOString(),
      endTime.toISOString(),
      drawTime.toISOString(),
      'pending'
    ]);
    
    console.log('✅ 测试期号创建成功:');
    console.log(`   期号: ${result.rows[0].issue_no}`);
    console.log(`   开奖时间: ${drawTime.toLocaleString('zh-CN')}`);
    console.log(`   倒计时: ${Math.floor((drawTime.getTime() - now.getTime()) / 1000)} 秒`);
    
  } catch (error) {
    console.error('❌ 创建测试期号失败:', error.message);
  } finally {
    await pool.end();
  }
}

createTestIssue();
