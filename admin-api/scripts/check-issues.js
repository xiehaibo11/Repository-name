const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function checkIssues() {
  try {
    console.log('🔍 查询最新的期号数据...');
    
    const query = `
      SELECT 
        issue_no, 
        start_time, 
        draw_time, 
        status,
        created_at
      FROM lottery_issues 
      ORDER BY id DESC 
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    if (result.rows.length === 0) {
      console.log('❌ 没有找到期号数据');
    } else {
      console.log(`📊 找到 ${result.rows.length} 条期号记录：`);
      console.log('');
      
      result.rows.forEach((row, index) => {
        const startTime = new Date(row.start_time).toLocaleString('zh-CN');
        const drawTime = new Date(row.draw_time).toLocaleString('zh-CN');
        const createdAt = new Date(row.created_at).toLocaleString('zh-CN');
        
        console.log(`${index + 1}. 期号: ${row.issue_no}`);
        console.log(`   开始时间: ${startTime}`);
        console.log(`   开奖时间: ${drawTime}`);
        console.log(`   状态: ${row.status}`);
        console.log(`   创建时间: ${createdAt}`);
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ 查询失败:', error);
  } finally {
    await pool.end();
  }
}

checkIssues();
