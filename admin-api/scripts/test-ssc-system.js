const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testSSCSystem() {
  try {
    console.log('🧪 测试分分时时彩系统状态...');
    
    // 1. 检查彩种是否存在
    const lotteryResult = await pool.query('SELECT * FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryType = lotteryResult.rows[0];
    console.log(`✅ 彩种信息:`, {
      id: lotteryType.id,
      name: lotteryType.name,
      code: lotteryType.code
    });
    
    // 2. 检查当前期号
    const currentIssueResult = await pool.query(`
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = $1 AND status = 'pending'
      ORDER BY draw_time ASC 
      LIMIT 1
    `, [lotteryType.id]);
    
    if (currentIssueResult.rows.length > 0) {
      const currentIssue = currentIssueResult.rows[0];
      console.log(`📅 当前期号:`, {
        issue_no: currentIssue.issue_no,
        start_time: new Date(currentIssue.start_time).toLocaleString('zh-CN'),
        end_time: new Date(currentIssue.end_time).toLocaleString('zh-CN'),
        draw_time: new Date(currentIssue.draw_time).toLocaleString('zh-CN'),
        status: currentIssue.status
      });
      
      // 检查是否到了开奖时间
      const now = new Date();
      const drawTime = new Date(currentIssue.draw_time);
      if (now >= drawTime) {
        console.log('⏰ 当前期号已到开奖时间');
      } else {
        const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
        console.log(`⏰ 距离开奖还有 ${remainingTime} 秒`);
      }
    } else {
      console.log('⚠️  没有找到待开奖的期号');
    }
    
    // 3. 检查最近的开奖记录
    const recentDrawsResult = await pool.query(`
      SELECT d.*, i.issue_no, i.draw_time as issue_draw_time
      FROM lottery_draws d
      JOIN lottery_issues i ON d.issue_id = i.id
      WHERE d.lottery_type_id = $1
      ORDER BY d.draw_time DESC
      LIMIT 5
    `, [lotteryType.id]);
    
    console.log(`🎲 最近开奖记录 (${recentDrawsResult.rows.length} 条):`);
    recentDrawsResult.rows.forEach((draw, index) => {
      console.log(`${index + 1}. 期号: ${draw.issue_no}`);
      console.log(`   开奖号码: ${draw.draw_numbers}`);
      console.log(`   和值: ${draw.sum_value} (${draw.sum_big_small}${draw.sum_odd_even})`);
      console.log(`   开奖时间: ${new Date(draw.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖方式: ${draw.draw_method === 'auto' ? '自动开奖' : '手动开奖'}`);
      console.log('');
    });
    
    // 4. 统计今日开奖情况
    const today = new Date().toISOString().split('T')[0];
    const todayStatsResult = await pool.query(`
      SELECT 
        COUNT(*) as total_draws,
        COUNT(CASE WHEN draw_status = 'drawn' THEN 1 END) as completed_draws,
        COUNT(CASE WHEN draw_method = 'auto' THEN 1 END) as auto_draws,
        COUNT(CASE WHEN draw_method = 'manual' THEN 1 END) as manual_draws
      FROM lottery_draws d
      JOIN lottery_issues i ON d.issue_id = i.id
      WHERE d.lottery_type_id = $1 AND i.issue_date = $2
    `, [lotteryType.id, today]);
    
    const stats = todayStatsResult.rows[0];
    console.log(`📊 今日统计:`, {
      总开奖期数: stats.total_draws,
      已完成开奖: stats.completed_draws,
      自动开奖: stats.auto_draws,
      手动开奖: stats.manual_draws
    });
    
    // 5. 检查系统是否需要生成新期号
    const futureIssuesResult = await pool.query(`
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = $1 AND status = 'pending' AND draw_time > NOW()
    `, [lotteryType.id]);
    
    const futureCount = futureIssuesResult.rows[0].count;
    console.log(`🔮 未来待开奖期数: ${futureCount}`);
    
    if (futureCount < 5) {
      console.log('⚠️  建议生成更多期号以确保系统正常运行');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testSSCSystem();
    console.log('\n🎉 分分时时彩系统状态检查完成！');
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testSSCSystem
};
