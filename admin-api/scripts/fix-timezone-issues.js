const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

// 生成新格式期号 - YYMMDD+HHMM
function generateNewFormatIssueNo(date, hours, minutes) {
  const year = String(date.getFullYear()).slice(-2); // 年份后两位
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const timeStr = String(hours).padStart(2, '0') + String(minutes).padStart(2, '0');
  
  return `${year}${month}${day}${timeStr}`;
}

async function fixTimezoneIssues() {
  try {
    console.log('🕐 修复时区问题...');
    
    // 使用本地时间，不转换为UTC
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const dateStr = today.toISOString().split('T')[0];
    
    // 计算当前时间
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    
    console.log(`⏰ 当前本地时间: ${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`);
    
    // 获取分分时时彩彩种ID
    const lotteryResult = await pool.query('SELECT id FROM lottery_types WHERE code = $1', ['ssc']);
    if (lotteryResult.rows.length === 0) {
      console.error('❌ 分分时时彩彩种不存在');
      return;
    }
    
    const lotteryTypeId = lotteryResult.rows[0].id;
    
    // 删除今日所有期号
    console.log('🗑️ 清理今日期号数据...');
    const deleteQuery = `
      DELETE FROM lottery_issues 
      WHERE lottery_type_id = $1 AND issue_date = $2
    `;
    const deleteResult = await pool.query(deleteQuery, [lotteryTypeId, dateStr]);
    console.log(`✅ 删除了 ${deleteResult.rowCount} 条旧期号记录`);
    
    let successCount = 0;
    
    // 生成当前时间前后各5期
    for (let offset = -5; offset <= 5; offset++) {
      const targetTime = new Date(now.getTime() + offset * 60 * 1000); // 加减分钟
      const h = targetTime.getHours();
      const m = targetTime.getMinutes();
      
      const issueNo = generateNewFormatIssueNo(targetTime, h, m);
      
      // 计算期号索引
      const issueIndex = h * 60 + m + 1;
      
      // 计算时间 - 使用本地时间字符串，避免时区转换
      const year = targetTime.getFullYear();
      const month = String(targetTime.getMonth() + 1).padStart(2, '0');
      const day = String(targetTime.getDate()).padStart(2, '0');
      const hour = String(h).padStart(2, '0');
      const minute = String(m).padStart(2, '0');
      
      const startTimeStr = `${year}-${month}-${day} ${hour}:${minute}:00`;
      const endTimeStr = `${year}-${month}-${day} ${hour}:${minute}:50`;
      
      // 计算开奖时间（下一分钟）
      const drawTargetTime = new Date(targetTime.getTime() + 60 * 1000);
      const drawHour = String(drawTargetTime.getHours()).padStart(2, '0');
      const drawMinute = String(drawTargetTime.getMinutes()).padStart(2, '0');
      const drawDay = String(drawTargetTime.getDate()).padStart(2, '0');
      const drawMonth = String(drawTargetTime.getMonth() + 1).padStart(2, '0');
      const drawYear = drawTargetTime.getFullYear();
      const drawTimeStr = `${drawYear}-${drawMonth}-${drawDay} ${drawHour}:${drawMinute}:00`;
      
      try {
        const query = `
          INSERT INTO lottery_issues (
            lottery_type_id, issue_no, issue_date, issue_index,
            start_time, end_time, draw_time, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `;
        
        const values = [
          lotteryTypeId, issueNo, dateStr, issueIndex,
          startTimeStr, endTimeStr, drawTimeStr, 'pending'
        ];
        
        const result = await pool.query(query, values);
        if (result.rows.length > 0) {
          successCount++;
          const timeStr = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
          const isCurrent = (offset === 0) ? ' ⭐ 当前期' : '';
          console.log(`✅ 生成期号: ${issueNo} (${timeStr})${isCurrent}`);
        }
        
      } catch (error) {
        console.error(`❌ 生成期号 ${issueNo} 失败:`, error.message);
      }
    }
    
    console.log(`🎉 成功生成 ${successCount} 期修复时区的期号！`);
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await pool.end();
  }
}

fixTimezoneIssues();
