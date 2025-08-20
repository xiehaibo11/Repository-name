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
function generateRandomNumbers() {
  const numbers = [];
  for (let i = 0; i < 5; i++) {
    numbers.push(Math.floor(Math.random() * 10));
  }
  return numbers;
}

// 计算和值属性
function calculateSumProperties(numbers) {
  const sum = numbers.reduce((a, b) => a + b, 0);
  return {
    sum_value: sum,
    sum_big_small: sum >= 23 ? '大' : '小',
    sum_odd_even: sum % 2 === 0 ? '双' : '单'
  };
}

async function generateTestDraws() {
  try {
    console.log('🎲 开始生成测试开奖数据...');
    
    // 1. 获取分分时时彩彩种ID
    const lotteryResult = await pool.query('SELECT id FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryTypeId = lotteryResult.rows[0].id;
    console.log(`✅ 获取彩种ID: ${lotteryTypeId}`);
    
    // 2. 获取最近的期号
    const issuesResult = await pool.query(`
      SELECT id, issue_no, draw_time 
      FROM lottery_issues 
      WHERE lottery_type_id = $1 
      ORDER BY draw_time DESC 
      LIMIT 10
    `, [lotteryTypeId]);
    
    if (issuesResult.rows.length === 0) {
      console.error('❌ 没有找到期号数据');
      return;
    }
    
    console.log(`📊 找到 ${issuesResult.rows.length} 个期号`);
    
    let successCount = 0;
    
    // 3. 为每个期号生成开奖数据
    for (const issue of issuesResult.rows) {
      try {
        // 检查是否已经有开奖记录
        const existingDraw = await pool.query(
          'SELECT id FROM lottery_draws WHERE issue_id = $1',
          [issue.id]
        );
        
        if (existingDraw.rows.length > 0) {
          console.log(`⚠️  期号 ${issue.issue_no} 已有开奖记录，跳过`);
          continue;
        }
        
        // 生成随机开奖号码
        const numbers = generateRandomNumbers();
        const drawNumbers = numbers.join(',');
        const sumProps = calculateSumProperties(numbers);
        
        // 插入开奖记录
        const insertQuery = `
          INSERT INTO lottery_draws (
            lottery_type_id, issue_id, issue_no, draw_numbers,
            wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
            sum_value, sum_big_small, sum_odd_even,
            draw_method, draw_status, source, draw_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING id
        `;
        
        const values = [
          lotteryTypeId,
          issue.id,
          issue.issue_no,
          drawNumbers,
          numbers[0], // 万位
          numbers[1], // 千位
          numbers[2], // 百位
          numbers[3], // 十位
          numbers[4], // 个位
          sumProps.sum_value,
          sumProps.sum_big_small,
          sumProps.sum_odd_even,
          'auto',
          'drawn',
          '系统自动',
          issue.draw_time
        ];
        
        const result = await pool.query(insertQuery, values);
        
        if (result.rows.length > 0) {
          successCount++;
          console.log(`✅ 生成开奖记录: 期号 ${issue.issue_no}, 号码 ${drawNumbers}, 和值 ${sumProps.sum_value}(${sumProps.sum_big_small}${sumProps.sum_odd_even})`);
        }
        
      } catch (error) {
        console.error(`❌ 生成期号 ${issue.issue_no} 开奖记录失败:`, error.message);
      }
    }
    
    console.log(`🎉 开奖数据生成完成，共生成 ${successCount} 条记录`);
    
    // 4. 验证生成结果
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM lottery_draws WHERE lottery_type_id = $1',
      [lotteryTypeId]
    );
    
    console.log(`📊 当前开奖记录总数: ${countResult.rows[0].count}`);
    
    // 5. 显示最新的几条记录
    const latestResult = await pool.query(`
      SELECT 
        ld.issue_no, ld.draw_numbers, ld.sum_value, 
        ld.sum_big_small, ld.sum_odd_even, ld.draw_time
      FROM lottery_draws ld
      WHERE ld.lottery_type_id = $1
      ORDER BY ld.draw_time DESC
      LIMIT 5
    `, [lotteryTypeId]);
    
    console.log('\n📋 最新开奖记录:');
    latestResult.rows.forEach((row, index) => {
      console.log(`${index + 1}. 期号: ${row.issue_no}, 号码: ${row.draw_numbers}, 和值: ${row.sum_value}(${row.sum_big_small}${row.sum_odd_even}), 时间: ${new Date(row.draw_time).toLocaleString('zh-CN')}`);
    });
    
  } catch (error) {
    console.error('❌ 生成测试开奖数据失败:', error);
  }
}

async function main() {
  try {
    await generateTestDraws();
    console.log('\n🎉 测试开奖数据生成任务完成！');
  } catch (error) {
    console.error('❌ 任务失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行生成任务
if (require.main === module) {
  main();
}

module.exports = {
  generateTestDraws
};
