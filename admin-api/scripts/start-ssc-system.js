const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function startSSCSystem() {
  try {
    console.log('🚀 启动分分时时彩系统...');
    
    // 检查系统状态
    const statusResponse = await fetch('http://localhost:3001/api/admin/ssc/status', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (statusResponse.ok) {
      const statusData = await statusResponse.json();
      console.log('📊 当前系统状态:', statusData);
      
      if (statusData.data && statusData.data.isRunning) {
        console.log('✅ 系统已经在运行中');
        return;
      }
    }
    
    // 启动系统
    console.log('🔄 正在启动系统...');
    const startResponse = await fetch('http://localhost:3001/api/admin/ssc/start', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    if (startResponse.ok) {
      const startData = await startResponse.json();
      console.log('✅ 系统启动成功:', startData);
    } else {
      console.log('❌ 系统启动失败:', await startResponse.text());
    }
    
  } catch (error) {
    console.error('❌ 启动失败:', error.message);
  }
}

async function checkSystemStatus() {
  try {
    console.log('🔍 检查系统运行状态...');
    
    // 检查当前期号
    const currentIssueQuery = `
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = 1 AND status = 'pending'
      ORDER BY draw_time ASC 
      LIMIT 1
    `;
    
    const currentIssueResult = await pool.query(currentIssueQuery);
    
    if (currentIssueResult.rows.length > 0) {
      const currentIssue = currentIssueResult.rows[0];
      console.log(`📅 当前期号: ${currentIssue.issue_no}`);
      console.log(`⏰ 开奖时间: ${new Date(currentIssue.draw_time).toLocaleString('zh-CN')}`);
      
      const now = new Date();
      const drawTime = new Date(currentIssue.draw_time);
      const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
      
      if (remainingTime > 0) {
        console.log(`⏳ 距离开奖还有 ${remainingTime} 秒`);
      } else {
        console.log('⏰ 已到开奖时间，等待系统自动开奖...');
      }
    } else {
      console.log('⚠️  没有找到待开奖的期号');
    }
    
    // 检查最新开奖记录
    const latestDrawQuery = `
      SELECT * FROM lottery_draws 
      WHERE lottery_type_id = 1
      ORDER BY draw_time DESC 
      LIMIT 1
    `;
    
    const latestDrawResult = await pool.query(latestDrawQuery);
    
    if (latestDrawResult.rows.length > 0) {
      const latestDraw = latestDrawResult.rows[0];
      console.log(`🎲 最新开奖: ${latestDraw.issue_no} - ${latestDraw.draw_numbers}`);
      console.log(`⏰ 开奖时间: ${new Date(latestDraw.draw_time).toLocaleString('zh-CN')}`);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

async function main() {
  try {
    await checkSystemStatus();
    console.log('\n🎉 系统状态检查完成！');
    
    console.log('\n💡 提示:');
    console.log('- 系统会自动在每分钟整点生成新期号');
    console.log('- 系统会自动在每期结束时进行开奖');
    console.log('- 开奖记录会自动显示在前端开奖管理页面');
    console.log('- 前端页面每30秒自动刷新一次');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = {
  startSSCSystem,
  checkSystemStatus
};
