const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

// 模拟期号生成逻辑（从服务层复制）
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

// 模拟前端期号生成逻辑
function generateFrontendIssueNo(date) {
  const year = String(date.getFullYear()).slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${year}${month}${day}${hours}${minutes}`;
}

async function verifyIssueConsistency() {
  try {
    console.log('🔍 验证期号生成一致性...');
    
    // 1. 获取彩种信息
    const lotteryResult = await pool.query('SELECT * FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryType = lotteryResult.rows[0];
    console.log(`✅ 彩种信息:`, {
      id: lotteryType.id,
      name: lotteryType.name,
      issue_format: lotteryType.issue_format
    });
    
    // 2. 测试不同时间点的期号生成
    const testTimes = [
      new Date('2025-07-26T10:30:00'),
      new Date('2025-07-26T14:45:00'),
      new Date('2025-07-26T18:15:00'),
      new Date('2025-07-26T23:59:00')
    ];
    
    console.log('\n📊 测试期号生成一致性:');
    
    for (const testTime of testTimes) {
      console.log(`\n⏰ 测试时间: ${testTime.toLocaleString('zh-CN')}`);
      
      // 后端逻辑：基于当天分钟数计算索引
      const dayStart = new Date(testTime);
      dayStart.setHours(0, 0, 0, 0);
      const minutesFromStart = Math.floor((testTime.getTime() - dayStart.getTime()) / (1000 * 60));
      const issueIndex = minutesFromStart + 1;
      
      // 后端生成的期号
      const backendIssueNo = generateIssueNo(lotteryType, testTime, issueIndex);
      
      // 前端生成的期号
      const frontendIssueNo = generateFrontendIssueNo(testTime);
      
      console.log(`   后端期号: ${backendIssueNo} (索引: ${issueIndex})`);
      console.log(`   前端期号: ${frontendIssueNo}`);
      
      if (backendIssueNo === frontendIssueNo) {
        console.log('   ✅ 期号一致');
      } else {
        console.log('   ❌ 期号不一致');
      }
    }
    
    // 3. 检查数据库中的实际数据
    console.log('\n🔍 检查数据库中的期号和开奖记录:');
    
    const query = `
      SELECT 
        i.issue_no as issue_no,
        i.start_time,
        i.draw_time,
        i.status as issue_status,
        d.issue_no as draw_issue_no,
        d.draw_numbers,
        d.draw_status
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = $1
      ORDER BY i.start_time DESC
      LIMIT 10
    `;
    
    const result = await pool.query(query, [lotteryType.id]);
    
    console.log(`📋 最近10期数据:`);
    result.rows.forEach((row, index) => {
      console.log(`\n${index + 1}. 期号: ${row.issue_no}`);
      console.log(`   开始时间: ${new Date(row.start_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(row.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   期号状态: ${row.issue_status}`);
      
      if (row.draw_issue_no) {
        console.log(`   开奖期号: ${row.draw_issue_no}`);
        console.log(`   开奖号码: ${row.draw_numbers}`);
        console.log(`   开奖状态: ${row.draw_status}`);
        
        if (row.issue_no === row.draw_issue_no) {
          console.log('   ✅ 期号匹配');
        } else {
          console.log('   ❌ 期号不匹配');
        }
      } else {
        console.log('   ⏳ 未开奖');
      }
    });
    
    // 4. 检查期号格式的正确性
    console.log('\n🔍 验证期号格式:');
    
    const formatCheck = result.rows.filter(row => row.issue_no);
    let formatCorrect = 0;
    let formatIncorrect = 0;
    
    formatCheck.forEach(row => {
      const issueNo = row.issue_no;
      const startTime = new Date(row.start_time);
      
      // 期号应该是 YYMMDD + HHMM 格式
      const expectedFormat = generateFrontendIssueNo(startTime);
      
      if (issueNo === expectedFormat) {
        formatCorrect++;
      } else {
        formatIncorrect++;
        console.log(`   ❌ 格式错误: ${issueNo} (预期: ${expectedFormat})`);
      }
    });
    
    console.log(`📊 格式检查结果:`);
    console.log(`   正确格式: ${formatCorrect} 期`);
    console.log(`   错误格式: ${formatIncorrect} 期`);
    
    if (formatIncorrect === 0) {
      console.log('   ✅ 所有期号格式正确');
    } else {
      console.log('   ⚠️  存在格式错误的期号');
    }
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  }
}

async function main() {
  try {
    await verifyIssueConsistency();
    console.log('\n🎉 期号一致性验证完成！');
    
    console.log('\n💡 总结:');
    console.log('- 后端使用基于分钟索引的期号生成逻辑');
    console.log('- 前端使用直接时间格式的期号生成逻辑');
    console.log('- 两者应该生成相同的期号格式: YYMMDD + HHMM');
    console.log('- 开奖记录的期号应该与奖期管理的期号完全一致');
    
  } catch (error) {
    console.error('❌ 验证失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行验证
if (require.main === module) {
  main();
}

module.exports = {
  verifyIssueConsistency,
  generateIssueNo,
  generateFrontendIssueNo
};
