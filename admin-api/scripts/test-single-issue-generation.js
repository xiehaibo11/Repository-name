const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testSingleIssueGeneration() {
  try {
    console.log('🧪 测试单期生成功能...');
    
    // 1. 获取分分时时彩彩种ID
    const lotteryResult = await pool.query('SELECT id FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryTypeId = lotteryResult.rows[0].id;
    console.log(`✅ 获取彩种ID: ${lotteryTypeId}`);
    
    // 2. 计算下一期的时间
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1, 0, 0); // 下一分钟
    
    const year = String(nextMinute.getFullYear()).slice(-2);
    const month = String(nextMinute.getMonth() + 1).padStart(2, '0');
    const day = String(nextMinute.getDate()).padStart(2, '0');
    const hours = String(nextMinute.getHours()).padStart(2, '0');
    const minutes = String(nextMinute.getMinutes()).padStart(2, '0');
    const expectedIssueNo = `${year}${month}${day}${hours}${minutes}`;
    
    console.log(`📅 预期期号: ${expectedIssueNo}`);
    console.log(`⏰ 生成时间: ${nextMinute.toISOString()}`);
    
    // 3. 调用单期生成API
    const fetch = require('node-fetch');
    const response = await fetch('http://localhost:3001/api/admin/lottery/issues/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer test-token' // 这里需要实际的token
      },
      body: JSON.stringify({
        lottery_type_id: lotteryTypeId,
        specific_time: nextMinute.toISOString()
      })
    });
    
    const result = await response.json();
    console.log('📡 API响应:', JSON.stringify(result, null, 2));
    
    if (result.status === 'success') {
      console.log('✅ 单期生成成功');
      
      // 4. 验证生成的期号
      const issue = result.data[0];
      console.log(`🎯 生成的期号: ${issue.issue_no}`);
      console.log(`⏰ 开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`⏰ 结束时间: ${new Date(issue.end_time).toLocaleString('zh-CN')}`);
      console.log(`⏰ 开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      
      // 验证期号格式
      if (issue.issue_no === expectedIssueNo) {
        console.log('✅ 期号格式正确');
      } else {
        console.log(`⚠️  期号格式不匹配，预期: ${expectedIssueNo}, 实际: ${issue.issue_no}`);
      }
      
      // 验证时间逻辑
      const startTime = new Date(issue.start_time);
      const endTime = new Date(issue.end_time);
      const drawTime = new Date(issue.draw_time);
      
      if (startTime.getMinutes() === nextMinute.getMinutes() && 
          startTime.getHours() === nextMinute.getHours()) {
        console.log('✅ 开始时间正确');
      } else {
        console.log('⚠️  开始时间不正确');
      }
      
      if (endTime.getSeconds() === 50) {
        console.log('✅ 结束时间正确（50秒）');
      } else {
        console.log('⚠️  结束时间不正确');
      }
      
      if (drawTime.getMinutes() === (nextMinute.getMinutes() + 1) % 60) {
        console.log('✅ 开奖时间正确（下一分钟）');
      } else {
        console.log('⚠️  开奖时间不正确');
      }
      
    } else {
      console.log('❌ 单期生成失败:', result.message);
    }
    
    // 5. 检查数据库中的期号
    const checkQuery = `
      SELECT 
        issue_no,
        start_time,
        end_time,
        draw_time,
        status
      FROM lottery_issues 
      WHERE lottery_type_id = $1 
        AND issue_no = $2
    `;
    
    const checkResult = await pool.query(checkQuery, [lotteryTypeId, expectedIssueNo]);
    
    if (checkResult.rows.length > 0) {
      console.log('✅ 数据库中找到生成的期号');
      const dbIssue = checkResult.rows[0];
      console.log(`📊 数据库记录:`, {
        issue_no: dbIssue.issue_no,
        start_time: new Date(dbIssue.start_time).toLocaleString('zh-CN'),
        end_time: new Date(dbIssue.end_time).toLocaleString('zh-CN'),
        draw_time: new Date(dbIssue.draw_time).toLocaleString('zh-CN'),
        status: dbIssue.status
      });
    } else {
      console.log('❌ 数据库中未找到生成的期号');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testSingleIssueGeneration();
    console.log('\n🎉 单期生成功能测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
if (require.main === module) {
  main();
}

module.exports = {
  testSingleIssueGeneration
};
