/**
 * 测试倒计时修复效果
 * 验证期号生成和同步是否正常
 */

const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_admin',
  password: process.env.DB_PASSWORD || 'xie080886',
  port: process.env.DB_PORT || 5432,
});

async function testCountdownFix() {
  try {
    console.log('🧪 测试倒计时修复效果...\n');
    
    // 1. 检查当前期号状态
    console.log('📅 检查当前期号状态:');
    const currentQuery = `
      SELECT 
        issue_no,
        start_time,
        draw_time,
        status,
        created_at
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND status = 'pending'
      ORDER BY draw_time ASC
      LIMIT 1
    `;
    
    const currentResult = await pool.query(currentQuery);
    
    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0];
      const now = new Date();
      const drawTime = new Date(current.draw_time);
      const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
      
      console.log(`   当前期号: ${current.issue_no}`);
      console.log(`   开奖时间: ${drawTime.toLocaleString('zh-CN')}`);
      console.log(`   剩余时间: ${remainingTime > 0 ? remainingTime + '秒' : '已到开奖时间'}`);
      console.log(`   期号状态: ${current.status}`);
      console.log(`   创建时间: ${new Date(current.created_at).toLocaleString('zh-CN')}`);
      
      // 检查期号是否连续
      await checkIssuesContinuity();
      
    } else {
      console.log('   ⚠️  没有找到待开奖的期号');
      console.log('   💡 这可能表示需要生成新期号');
    }
    
    // 2. 检查最近的期号生成情况
    console.log('\n🔍 检查最近期号生成情况:');
    const recentQuery = `
      SELECT 
        issue_no,
        start_time,
        draw_time,
        status,
        created_at,
        EXTRACT(EPOCH FROM (created_at - start_time)) as generation_delay
      FROM lottery_issues 
      WHERE lottery_type_id = 1
      ORDER BY start_time DESC
      LIMIT 10
    `;
    
    const recentResult = await pool.query(recentQuery);
    
    recentResult.rows.forEach((issue, index) => {
      const delaySeconds = Math.round(issue.generation_delay);
      const delayStatus = delaySeconds > 60 ? '⚠️ 延迟' : '✅ 正常';
      
      console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
      console.log(`      开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`      生成延迟: ${delaySeconds}秒 ${delayStatus}`);
      console.log(`      状态: ${issue.status}`);
    });
    
    // 3. 模拟前端期号计算
    console.log('\n🎯 模拟前端期号计算:');
    const now = new Date();
    const currentMinute = new Date(now);
    currentMinute.setSeconds(0, 0);
    
    const year = String(currentMinute.getFullYear()).slice(-2);
    const month = String(currentMinute.getMonth() + 1).padStart(2, '0');
    const day = String(currentMinute.getDate()).padStart(2, '0');
    const hours = String(currentMinute.getHours()).padStart(2, '0');
    const minutes = String(currentMinute.getMinutes()).padStart(2, '0');
    const expectedIssueNo = `${year}${month}${day}${hours}${minutes}`;
    
    console.log(`   当前时间: ${now.toLocaleString('zh-CN')}`);
    console.log(`   期望期号: ${expectedIssueNo}`);
    
    // 检查期号是否存在
    const checkQuery = `
      SELECT id, status FROM lottery_issues 
      WHERE lottery_type_id = 1 AND issue_no = $1
    `;
    
    const checkResult = await pool.query(checkQuery, [expectedIssueNo]);
    
    if (checkResult.rows.length > 0) {
      console.log(`   ✅ 期号存在，状态: ${checkResult.rows[0].status}`);
    } else {
      console.log(`   ❌ 期号不存在，需要生成`);
    }
    
    // 4. 检查定时任务日志
    console.log('\n📋 检查定时任务日志:');
    const logQuery = `
      SELECT 
        operation,
        result,
        issue_no,
        created_at,
        details
      FROM lottery_operation_logs 
      WHERE lottery_type_id = 1
        AND operation IN ('auto_generate_issue', 'check_and_draw', 'auto_draw')
      ORDER BY created_at DESC
      LIMIT 5
    `;
    
    const logResult = await pool.query(logQuery);
    
    if (logResult.rows.length > 0) {
      logResult.rows.forEach((log, index) => {
        console.log(`   ${index + 1}. 操作: ${log.operation}`);
        console.log(`      结果: ${log.result}`);
        console.log(`      期号: ${log.issue_no || '无'}`);
        console.log(`      时间: ${new Date(log.created_at).toLocaleString('zh-CN')}`);
        console.log(`      详情: ${log.details || '无'}`);
      });
    } else {
      console.log('   ⚠️  没有找到相关操作日志');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function checkIssuesContinuity() {
  try {
    console.log('\n🔗 检查期号连续性:');
    
    const continuityQuery = `
      WITH issue_times AS (
        SELECT 
          issue_no,
          start_time,
          LAG(start_time) OVER (ORDER BY start_time) as prev_start_time
        FROM lottery_issues 
        WHERE lottery_type_id = 1 
          AND start_time >= CURRENT_DATE
        ORDER BY start_time
      )
      SELECT 
        issue_no,
        start_time,
        prev_start_time,
        EXTRACT(EPOCH FROM (start_time - prev_start_time)) / 60 as gap_minutes
      FROM issue_times 
      WHERE prev_start_time IS NOT NULL 
        AND EXTRACT(EPOCH FROM (start_time - prev_start_time)) / 60 > 1.1
      LIMIT 5
    `;
    
    const gapResult = await pool.query(continuityQuery);
    
    if (gapResult.rows.length > 0) {
      console.log('   ⚠️  发现期号间隔异常:');
      gapResult.rows.forEach((gap, index) => {
        console.log(`   ${index + 1}. 期号: ${gap.issue_no}`);
        console.log(`      间隔: ${Math.round(gap.gap_minutes)}分钟`);
        console.log(`      时间: ${new Date(gap.start_time).toLocaleString('zh-CN')}`);
      });
    } else {
      console.log('   ✅ 期号连续性正常');
    }
  } catch (error) {
    console.error('检查期号连续性失败:', error);
  }
}

async function main() {
  try {
    await testCountdownFix();
    console.log('\n🎉 倒计时修复测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

if (require.main === module) {
  main();
}

module.exports = { testCountdownFix };
