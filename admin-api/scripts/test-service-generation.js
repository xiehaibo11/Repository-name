const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

// 简化的期号生成逻辑（从服务层复制）
function generateIssueNo(lotteryType, date, index) {
  const year = String(date.getFullYear()).slice(-2); // 年份后两位
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  let format = lotteryType.issue_format;
  format = format.replace('YYYY', String(date.getFullYear()));
  format = format.replace('YY', year);
  format = format.replace('MM', month);
  format = format.replace('DD', day);

  // 处理期号索引 {###} 或时间格式 {HHMM}
  const indexMatch = format.match(/\{([^}]+)\}/);
  if (indexMatch) {
    const placeholder = indexMatch[1];
    if (placeholder === 'HHMM') {
      // 根据期号索引计算时分
      const totalMinutes = (index - 1) % 1440; // 一天1440分钟
      const hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const timeStr = String(hours).padStart(2, '0') + String(minutes).padStart(2, '0');
      format = format.replace(indexMatch[0], timeStr);
    } else if (placeholder.match(/^#+$/)) {
      // 传统的数字索引格式
      const paddingLength = placeholder.length;
      const paddedIndex = String(index).padStart(paddingLength, '0');
      format = format.replace(indexMatch[0], paddedIndex);
    }
  }

  return format;
}

async function testServiceGeneration() {
  try {
    console.log('🧪 测试服务层单期生成功能...');
    
    // 1. 获取分分时时彩彩种信息
    const lotteryResult = await pool.query('SELECT * FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryType = lotteryResult.rows[0];
    console.log(`✅ 获取彩种信息:`, {
      id: lotteryType.id,
      name: lotteryType.name,
      code: lotteryType.code,
      issue_format: lotteryType.issue_format
    });
    
    // 2. 计算下一期的时间
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1, 0, 0); // 下一分钟
    
    console.log(`⏰ 当前时间: ${now.toLocaleString('zh-CN')}`);
    console.log(`⏰ 下一期时间: ${nextMinute.toLocaleString('zh-CN')}`);
    
    // 3. 计算期号索引（基于当天的分钟数）
    const dayStart = new Date(nextMinute);
    dayStart.setHours(0, 0, 0, 0);
    const minutesFromStart = Math.floor((nextMinute.getTime() - dayStart.getTime()) / (1000 * 60));
    const issueIndex = minutesFromStart + 1;
    
    console.log(`📊 期号索引: ${issueIndex} (当天第${issueIndex}分钟)`);
    
    // 4. 生成期号
    const issueNo = generateIssueNo(lotteryType, nextMinute, issueIndex);
    console.log(`🎯 生成期号: ${issueNo}`);
    
    // 5. 计算时间
    const startTime = new Date(nextMinute);
    startTime.setSeconds(0, 0); // 整分钟开始

    const endTime = new Date(startTime);
    endTime.setSeconds(50, 0); // 50秒结束

    const drawTime = new Date(startTime);
    drawTime.setMinutes(drawTime.getMinutes() + 1, 0, 0); // 下一分钟整点开奖
    
    console.log(`⏰ 开始时间: ${startTime.toLocaleString('zh-CN')}`);
    console.log(`⏰ 结束时间: ${endTime.toLocaleString('zh-CN')}`);
    console.log(`⏰ 开奖时间: ${drawTime.toLocaleString('zh-CN')}`);
    
    // 6. 插入数据库
    const query = `
      INSERT INTO lottery_issues (
        lottery_type_id, issue_no, issue_date, issue_index,
        start_time, end_time, draw_time, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON CONFLICT (lottery_type_id, issue_no) DO UPDATE SET
        start_time = EXCLUDED.start_time,
        end_time = EXCLUDED.end_time,
        draw_time = EXCLUDED.draw_time,
        status = EXCLUDED.status
      RETURNING *
    `;

    const values = [
      lotteryType.id,
      issueNo,
      nextMinute.toISOString().split('T')[0],
      issueIndex,
      startTime.toISOString(),
      endTime.toISOString(),
      drawTime.toISOString(),
      'pending'
    ];

    const result = await pool.query(query, values);
    
    if (result.rows.length > 0) {
      console.log('✅ 期号生成成功');
      const issue = result.rows[0];
      console.log(`📊 生成结果:`, {
        id: issue.id,
        issue_no: issue.issue_no,
        issue_date: issue.issue_date,
        issue_index: issue.issue_index,
        start_time: new Date(issue.start_time).toLocaleString('zh-CN'),
        end_time: new Date(issue.end_time).toLocaleString('zh-CN'),
        draw_time: new Date(issue.draw_time).toLocaleString('zh-CN'),
        status: issue.status
      });
    } else {
      console.log('❌ 期号生成失败');
    }
    
    // 7. 验证时间逻辑
    console.log('\n🔍 验证时间逻辑:');
    
    // 验证开始时间是整分钟
    if (startTime.getSeconds() === 0 && startTime.getMilliseconds() === 0) {
      console.log('✅ 开始时间是整分钟');
    } else {
      console.log('⚠️  开始时间不是整分钟');
    }
    
    // 验证结束时间是50秒
    if (endTime.getSeconds() === 50 && endTime.getMilliseconds() === 0) {
      console.log('✅ 结束时间是50秒');
    } else {
      console.log('⚠️  结束时间不是50秒');
    }
    
    // 验证开奖时间是下一分钟整点
    if (drawTime.getSeconds() === 0 && drawTime.getMilliseconds() === 0 &&
        drawTime.getMinutes() === (startTime.getMinutes() + 1) % 60) {
      console.log('✅ 开奖时间是下一分钟整点');
    } else {
      console.log('⚠️  开奖时间不正确');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testServiceGeneration();
    console.log('\n🎉 服务层单期生成功能测试完成！');
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
  testServiceGeneration
};
