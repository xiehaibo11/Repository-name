const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

// 生成随机开奖号码
function generateDrawNumbers() {
  const numbers = [];
  for (let i = 0; i < 5; i++) {
    numbers.push(Math.floor(Math.random() * 10));
  }
  return numbers.join(',');
}

// 计算和值属性
function calculateSumProperties(numbers) {
  const sum = numbers.split(',').reduce((acc, num) => acc + parseInt(num), 0);
  const bigSmall = sum >= 23 ? '大' : '小';
  const oddEven = sum % 2 === 0 ? '双' : '单';
  return { sum, bigSmall, oddEven };
}

async function testAutoDraw() {
  try {
    console.log('🧪 测试自动开奖流程...');
    
    // 1. 生成一个新的期号
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1, 0, 0);
    
    const year = String(nextMinute.getFullYear()).slice(-2);
    const month = String(nextMinute.getMonth() + 1).padStart(2, '0');
    const day = String(nextMinute.getDate()).padStart(2, '0');
    const hours = String(nextMinute.getHours()).padStart(2, '0');
    const minutes = String(nextMinute.getMinutes()).padStart(2, '0');
    const issueNo = `${year}${month}${day}${hours}${minutes}`;
    
    console.log(`📅 生成测试期号: ${issueNo}`);
    
    // 2. 插入期号
    const startTime = new Date(nextMinute);
    startTime.setSeconds(0, 0);
    
    const endTime = new Date(startTime);
    endTime.setSeconds(50, 0);
    
    const drawTime = new Date(startTime);
    drawTime.setMinutes(drawTime.getMinutes() + 1, 0, 0);
    
    const issueQuery = `
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
    
    const issueValues = [
      1, // lottery_type_id
      issueNo,
      nextMinute.toISOString().split('T')[0],
      parseInt(hours) * 60 + parseInt(minutes) + 1,
      startTime.toISOString(),
      endTime.toISOString(),
      drawTime.toISOString(),
      'pending'
    ];
    
    const issueResult = await pool.query(issueQuery, issueValues);
    const issue = issueResult.rows[0];
    
    console.log(`✅ 期号创建成功: ID ${issue.id}`);
    
    // 3. 生成开奖号码
    const drawNumbers = generateDrawNumbers();
    const { sum, bigSmall, oddEven } = calculateSumProperties(drawNumbers);
    
    console.log(`🎲 开奖号码: ${drawNumbers}`);
    console.log(`📊 和值: ${sum} (${bigSmall}${oddEven})`);
    
    // 4. 插入开奖记录
    const drawQuery = `
      INSERT INTO lottery_draws (
        lottery_type_id, issue_id, issue_no, draw_numbers,
        sum_value, sum_big_small, sum_odd_even,
        draw_method, draw_status, source, draw_time
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (lottery_type_id, issue_no) DO UPDATE SET
        draw_numbers = EXCLUDED.draw_numbers,
        sum_value = EXCLUDED.sum_value,
        sum_big_small = EXCLUDED.sum_big_small,
        sum_odd_even = EXCLUDED.sum_odd_even,
        draw_method = EXCLUDED.draw_method,
        draw_status = EXCLUDED.draw_status,
        source = EXCLUDED.source,
        draw_time = EXCLUDED.draw_time
      RETURNING *
    `;
    
    const drawValues = [
      1, // lottery_type_id
      issue.id, // issue_id
      issueNo,
      drawNumbers,
      sum,
      bigSmall,
      oddEven,
      'auto',
      'drawn',
      '系统自动',
      drawTime.toISOString()
    ];
    
    const drawResult = await pool.query(drawQuery, drawValues);
    const draw = drawResult.rows[0];
    
    console.log(`✅ 开奖记录创建成功: ID ${draw.id}`);
    
    // 5. 更新期号状态
    await pool.query(
      'UPDATE lottery_issues SET status = $1 WHERE id = $2',
      ['drawn', issue.id]
    );
    
    console.log(`✅ 期号状态更新为已开奖`);
    
    // 6. 验证数据
    const verifyQuery = `
      SELECT d.*, i.start_time, i.end_time
      FROM lottery_draws d
      JOIN lottery_issues i ON d.issue_id = i.id
      WHERE d.id = $1
    `;
    
    const verifyResult = await pool.query(verifyQuery, [draw.id]);
    const verifyData = verifyResult.rows[0];
    
    console.log(`\n🔍 验证结果:`);
    console.log(`   期号: ${verifyData.issue_no}`);
    console.log(`   开奖号码: ${verifyData.draw_numbers}`);
    console.log(`   和值: ${verifyData.sum_value} (${verifyData.sum_big_small}${verifyData.sum_odd_even})`);
    console.log(`   开奖方式: ${verifyData.draw_method}`);
    console.log(`   开奖状态: ${verifyData.draw_status}`);
    console.log(`   数据来源: ${verifyData.source}`);
    console.log(`   开奖时间: ${new Date(verifyData.draw_time).toLocaleString('zh-CN')}`);
    
    console.log(`\n✅ 测试开奖流程完成！`);
    console.log(`💡 现在可以在前端开奖管理页面查看这条新记录`);
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testAutoDraw();
    console.log('\n🎉 自动开奖测试完成！');
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
  testAutoDraw
};
