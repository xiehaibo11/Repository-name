const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function checkCurrentIssues() {
  try {
    console.log('🔍 检查当前期号数据...');
    
    // 检查期号总数
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
    `;
    
    const countResult = await pool.query(countQuery);
    console.log(`📊 分分时时彩期号总数: ${countResult.rows[0].total_count}`);
    
    // 检查今日期号
    const todayQuery = `
      SELECT COUNT(*) as today_count
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
        AND issue_date = CURRENT_DATE
    `;
    
    const todayResult = await pool.query(todayQuery);
    console.log(`📅 今日期号数量: ${todayResult.rows[0].today_count}`);
    
    // 检查最近的期号
    const recentQuery = `
      SELECT 
        issue_no,
        start_time,
        end_time,
        draw_time,
        status
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      ORDER BY start_time DESC
      LIMIT 10
    `;
    
    const recentResult = await pool.query(recentQuery);
    console.log('\n📋 最近10期期号:');
    recentResult.rows.forEach((row, index) => {
      const startTime = new Date(row.start_time).toLocaleString('zh-CN');
      const endTime = new Date(row.end_time).toLocaleString('zh-CN');
      const drawTime = new Date(row.draw_time).toLocaleString('zh-CN');
      
      console.log(`${index + 1}. 期号: ${row.issue_no}`);
      console.log(`   开始时间: ${startTime}`);
      console.log(`   结束时间: ${endTime}`);
      console.log(`   开奖时间: ${drawTime}`);
      console.log(`   状态: ${row.status}`);
      console.log('');
    });
    
    // 检查是否有重复的开始时间
    const duplicateQuery = `
      SELECT 
        start_time,
        COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      GROUP BY start_time 
      HAVING COUNT(*) > 1
      ORDER BY start_time;
    `;
    
    const duplicateResult = await pool.query(duplicateQuery);
    
    if (duplicateResult.rows.length === 0) {
      console.log('✅ 确认：没有重复的开始时间');
    } else {
      console.log(`⚠️  发现 ${duplicateResult.rows.length} 个重复的开始时间:`);
      duplicateResult.rows.forEach((row, index) => {
        console.log(`${index + 1}. 开始时间: ${row.start_time}, 重复次数: ${row.count}`);
      });
    }
    
  } catch (error) {
    console.error('检查期号数据失败:', error);
    throw error;
  }
}

async function main() {
  try {
    await checkCurrentIssues();
    console.log('\n🎉 期号数据检查完成！');
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = {
  checkCurrentIssues
};
