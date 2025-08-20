const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function fixCurrentIssue() {
  try {
    console.log('🔍 检查当前期号状态...');
    
    // 检查当前期号
    const currentQuery = `
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      AND status = 'pending'
      ORDER BY draw_time DESC 
      LIMIT 1
    `;
    
    const currentResult = await pool.query(currentQuery);
    
    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0];
      const now = new Date();
      const drawTime = new Date(current.draw_time);
      const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
      
      console.log(`📅 当前期号: ${current.issue_no}`);
      console.log(`⏰ 开奖时间: ${drawTime.toLocaleString('zh-CN')}`);
      console.log(`⏰ 剩余时间: ${remainingTime > 0 ? remainingTime + '秒' : '已过期 ' + Math.abs(remainingTime) + '秒'}`);
      console.log(`📊 期号状态: ${current.status}`);
      
      if (remainingTime <= 0) {
        console.log('⚠️ 当前期号已过期，需要开奖并生成新期号');
        
        // 先开奖当前期号
        console.log('🎲 正在开奖当前期号...');
        const drawNumbers = generateRandomNumbers();
        const sumValue = drawNumbers.reduce((sum, num) => sum + num, 0);
        
        await pool.query(`
          UPDATE lottery_issues 
          SET status = 'drawn', 
              draw_numbers = $1,
              sum_value = $2,
              sum_big_small = $3,
              sum_odd_even = $4,
              actual_draw_time = NOW()
          WHERE id = $5
        `, [
          drawNumbers.join(','),
          sumValue,
          sumValue >= 23 ? 'big' : 'small',
          sumValue % 2 === 0 ? 'even' : 'odd',
          current.id
        ]);
        
        console.log(`✅ 期号 ${current.issue_no} 开奖完成: ${drawNumbers.join(',')}`);
        
        // 生成新的当前期号
        console.log('📅 正在生成新的当前期号...');
        const newIssueNo = generateCurrentIssueNo();
        const newStartTime = new Date();
        const newEndTime = new Date(newStartTime.getTime() + 60 * 1000); // 1分钟后
        const newDrawTime = new Date(newEndTime.getTime()); // 结束时间就是开奖时间
        
        await pool.query(`
          INSERT INTO lottery_issues (
            lottery_type_id, issue_no, start_time, end_time, draw_time, status, created_at
          ) VALUES (
            (SELECT id FROM lottery_types WHERE code = 'ssc'),
            $1, $2, $3, $4, 'pending', NOW()
          )
        `, [newIssueNo, newStartTime, newEndTime, newDrawTime]);
        
        console.log(`✅ 新期号 ${newIssueNo} 生成完成`);
        console.log(`⏰ 开奖时间: ${newDrawTime.toLocaleString('zh-CN')}`);
        
      } else {
        console.log('✅ 当前期号正常，无需处理');
      }
      
    } else {
      console.log('⚠️ 没有找到当前期号，生成新期号...');
      
      // 生成新的当前期号
      const newIssueNo = generateCurrentIssueNo();
      const newStartTime = new Date();
      const newEndTime = new Date(newStartTime.getTime() + 60 * 1000); // 1分钟后
      const newDrawTime = new Date(newEndTime.getTime()); // 结束时间就是开奖时间
      
      await pool.query(`
        INSERT INTO lottery_issues (
          lottery_type_id, issue_no, start_time, end_time, draw_time, status, created_at
        ) VALUES (
          (SELECT id FROM lottery_types WHERE code = 'ssc'),
          $1, $2, $3, $4, 'pending', NOW()
        )
      `, [newIssueNo, newStartTime, newEndTime, newDrawTime]);
      
      console.log(`✅ 新期号 ${newIssueNo} 生成完成`);
      console.log(`⏰ 开奖时间: ${newDrawTime.toLocaleString('zh-CN')}`);
    }
    
    console.log('🎉 当前期号状态修复完成！');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await pool.end();
  }
}

// 生成当前期号
function generateCurrentIssueNo() {
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const day = now.getDate().toString().padStart(2, '0');
  const hour = now.getHours().toString().padStart(2, '0');
  const minute = now.getMinutes().toString().padStart(2, '0');
  
  return `25${year}${month}${day}${hour}${minute}`;
}

// 生成随机开奖号码
function generateRandomNumbers() {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
}

fixCurrentIssue();
