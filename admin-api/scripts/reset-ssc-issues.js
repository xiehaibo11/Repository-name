const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// 生成期号 - 每天1440期，格式：YYYYMMDD0001-YYYYMMDD1440
function generateIssueNo(date, index) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const paddedIndex = String(index).padStart(4, '0'); // 4位数字
  return `${year}${month}${day}${paddedIndex}`;
}

async function resetSSCIssues() {
  try {
    console.log('🔄 重置分分时时彩期号数据...');
    
    // 1. 更新彩种配置
    console.log('📝 更新分分时时彩彩种配置...');
    await pool.query(`
      UPDATE lottery_types SET
        draw_frequency = 'minutes',
        draw_interval = 1,
        description = '分分时时彩，每分钟开奖一次，全天24小时不间断。期号格式：YYYYMMDD0001-YYYYMMDD1440，每日1440期。开奖前10秒封盘。'
      WHERE code = 'ssc'
    `);
    
    // 2. 清理今日旧期号数据
    const today = new Date();
    const dateStr = today.toISOString().split('T')[0];
    
    console.log('🗑️ 清理今日旧期号数据...');
    const deleteResult = await pool.query(`
      DELETE FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
        AND issue_date = $1
    `, [dateStr]);
    
    console.log(`删除了 ${deleteResult.rowCount} 条旧期号记录`);
    
    // 3. 生成新的1440期期号
    console.log('🎲 生成新的1440期期号（每分钟一期）...');

    const lotteryResult = await pool.query('SELECT id FROM lottery_types WHERE code = $1', ['ssc']);
    const lotteryTypeId = lotteryResult.rows[0].id;

    let successCount = 0;

    for (let i = 1; i <= 1440; i++) {
      const issueNo = generateIssueNo(today, i);

      // 计算时间 - 每分钟一期
      const startTime = new Date(today);
      startTime.setHours(0, 0, 0, 0);
      startTime.setMinutes((i - 1) * 1); // 每分钟一期

      const endTime = new Date(startTime);
      endTime.setMinutes(endTime.getMinutes(), 50, 0, 0); // 50秒结束（开奖前10秒封盘）

      const drawTime = new Date(startTime);
      drawTime.setMinutes(drawTime.getMinutes() + 1, 0, 0, 0); // 下一分钟整点开奖
      
      try {
        const query = `
          INSERT INTO lottery_issues (
            lottery_type_id, issue_no, issue_date, issue_index,
            start_time, end_time, draw_time, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `;
        
        const values = [
          lotteryTypeId, issueNo, dateStr, i,
          startTime.toISOString(), endTime.toISOString(), drawTime.toISOString(), 'pending'
        ];
        
        const result = await pool.query(query, values);
        if (result.rows.length > 0) {
          successCount++;
          // 每100期显示一次进度
          if (i % 100 === 0) {
            console.log(`✅ 进度: ${i}/1440 (${Math.round(i/1440*100)}%) - 期号: ${issueNo}`);
          }
        }

      } catch (error) {
        console.error(`❌ 生成期号 ${issueNo} 失败:`, error.message);
      }
    }

    console.log(`🎉 期号重置完成！成功生成 ${successCount}/1440 期`);
    
    // 4. 验证结果
    const finalCheck = await pool.query(`
      SELECT COUNT(*) as count, MIN(issue_no) as first_issue, MAX(issue_no) as last_issue
      FROM lottery_issues 
      WHERE lottery_type_id = $1 AND issue_date = $2
    `, [lotteryTypeId, dateStr]);
    
    const result = finalCheck.rows[0];
    console.log(`📊 验证结果: 共${result.count}期，期号范围: ${result.first_issue} - ${result.last_issue}`);
    
  } catch (error) {
    console.error('❌ 重置失败:', error.message);
  } finally {
    await pool.end();
  }
}

resetSSCIssues();
