const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function checkDrawRecords() {
  try {
    console.log('🔍 检查开奖记录...');
    
    // 查询最近的开奖记录
    const query = `
      SELECT 
        d.id,
        d.issue_no,
        d.draw_numbers,
        d.sum_value,
        d.sum_big_small,
        d.sum_odd_even,
        d.draw_method,
        d.draw_status,
        d.source,
        d.draw_time,
        d.created_at,
        lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query);
    
    console.log(`📊 找到 ${result.rows.length} 条开奖记录:`);
    
    result.rows.forEach((record, index) => {
      console.log(`\n${index + 1}. ID: ${record.id}`);
      console.log(`   彩种: ${record.lottery_name}`);
      console.log(`   期号: ${record.issue_no}`);
      console.log(`   开奖号码: ${record.draw_numbers}`);
      console.log(`   和值: ${record.sum_value} (${record.sum_big_small}${record.sum_odd_even})`);
      console.log(`   开奖方式: ${record.draw_method}`);
      console.log(`   开奖状态: ${record.draw_status}`);
      console.log(`   数据来源: ${record.source}`);
      console.log(`   开奖时间: ${new Date(record.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   创建时间: ${new Date(record.created_at).toLocaleString('zh-CN')}`);
    });
    
    // 统计信息
    const statsQuery = `
      SELECT 
        COUNT(*) as total_records,
        COUNT(CASE WHEN draw_status = 'drawn' THEN 1 END) as completed_draws,
        COUNT(CASE WHEN draw_method = 'auto' THEN 1 END) as auto_draws,
        COUNT(CASE WHEN draw_method = 'manual' THEN 1 END) as manual_draws,
        MAX(draw_time) as latest_draw_time,
        MIN(draw_time) as earliest_draw_time
      FROM lottery_draws 
      WHERE lottery_type_id = 1
    `;
    
    const statsResult = await pool.query(statsQuery);
    const stats = statsResult.rows[0];
    
    console.log(`\n📈 统计信息:`);
    console.log(`   总记录数: ${stats.total_records}`);
    console.log(`   已完成开奖: ${stats.completed_draws}`);
    console.log(`   自动开奖: ${stats.auto_draws}`);
    console.log(`   手动开奖: ${stats.manual_draws}`);
    console.log(`   最新开奖时间: ${stats.latest_draw_time ? new Date(stats.latest_draw_time).toLocaleString('zh-CN') : '无'}`);
    console.log(`   最早开奖时间: ${stats.earliest_draw_time ? new Date(stats.earliest_draw_time).toLocaleString('zh-CN') : '无'}`);
    
    // 检查今日开奖情况
    const today = new Date().toISOString().split('T')[0];
    const todayQuery = `
      SELECT COUNT(*) as today_count
      FROM lottery_draws d
      JOIN lottery_issues i ON d.issue_id = i.id
      WHERE d.lottery_type_id = 1 AND i.issue_date = $1
    `;
    
    const todayResult = await pool.query(todayQuery, [today]);
    console.log(`\n📅 今日开奖记录: ${todayResult.rows[0].today_count} 条`);
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

async function main() {
  try {
    await checkDrawRecords();
    console.log('\n🎉 开奖记录检查完成！');
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
  checkDrawRecords
};
