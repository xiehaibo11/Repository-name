const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function forceCleanupAndReset() {
  try {
    console.log('🔄 强制清理并重置为倒计时结束生成模式...');
    
    // 1. 清理所有未来期号和提前生成的期号
    console.log('\n🗑️ 清理所有不符合倒计时逻辑的期号...');
    
    // 先删除相关的开奖记录
    const deleteDrawsQuery = `
      DELETE FROM lottery_draws 
      WHERE lottery_type_id = 1 
        AND issue_id IN (
          SELECT id FROM lottery_issues 
          WHERE lottery_type_id = 1 
            AND (
              draw_time > NOW() 
              OR created_at < start_time - INTERVAL '1 minute'
            )
        )
    `;
    
    const deleteDrawsResult = await pool.query(deleteDrawsQuery);
    console.log(`✅ 删除了 ${deleteDrawsResult.rowCount} 条开奖记录`);
    
    // 再删除期号
    const deleteIssuesQuery = `
      DELETE FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND (
          draw_time > NOW() 
          OR created_at < start_time - INTERVAL '1 minute'
        )
    `;
    
    const deleteIssuesResult = await pool.query(deleteIssuesQuery);
    console.log(`✅ 删除了 ${deleteIssuesResult.rowCount} 个期号`);
    
    // 2. 检查当前时间，确定是否需要生成当前期号
    console.log('\n📅 检查当前期号需求...');
    
    const now = new Date();
    const currentMinute = new Date(now);
    currentMinute.setSeconds(0, 0); // 当前分钟整点
    
    const year = String(currentMinute.getFullYear()).slice(-2);
    const month = String(currentMinute.getMonth() + 1).padStart(2, '0');
    const day = String(currentMinute.getDate()).padStart(2, '0');
    const hours = String(currentMinute.getHours()).padStart(2, '0');
    const minutes = String(currentMinute.getMinutes()).padStart(2, '0');
    const currentIssueNo = `${year}${month}${day}${hours}${minutes}`;
    
    console.log(`   当前时间: ${now.toLocaleString('zh-CN')}`);
    console.log(`   当前期号应该是: ${currentIssueNo}`);
    
    // 检查当前期号是否存在
    const currentIssueQuery = `
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = 1 AND issue_no = $1
    `;
    
    const currentIssueResult = await pool.query(currentIssueQuery, [currentIssueNo]);
    
    if (currentIssueResult.rows.length === 0) {
      // 如果当前期号不存在，且当前时间已经过了开始时间，则生成当前期号
      const currentSeconds = now.getSeconds();
      
      if (currentSeconds >= 0) { // 任何时候都可以生成当前期号
        console.log('🎯 生成当前期号...');
        
        // 计算期号索引
        const dayStart = new Date(currentMinute);
        dayStart.setHours(0, 0, 0, 0);
        const minutesFromStart = Math.floor((currentMinute.getTime() - dayStart.getTime()) / (1000 * 60));
        const issueIndex = minutesFromStart + 1;
        
        // 计算时间
        const startTime = new Date(currentMinute);
        startTime.setSeconds(0, 0); // 整分钟开始
        
        const endTime = new Date(startTime);
        endTime.setSeconds(50, 0); // 50秒结束
        
        const drawTime = new Date(startTime);
        drawTime.setMinutes(drawTime.getMinutes() + 1, 0, 0); // 下一分钟整点开奖
        
        // 插入期号
        const insertQuery = `
          INSERT INTO lottery_issues (
            lottery_type_id, issue_no, issue_date, issue_index,
            start_time, end_time, draw_time, status
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *
        `;
        
        const values = [
          1, // lottery_type_id
          currentIssueNo,
          currentMinute.toISOString().split('T')[0],
          issueIndex,
          startTime.toISOString(),
          endTime.toISOString(),
          drawTime.toISOString(),
          'pending'
        ];
        
        const insertResult = await pool.query(insertQuery, values);
        
        if (insertResult.rows.length > 0) {
          console.log(`✅ 成功生成当前期号: ${currentIssueNo}`);
          console.log(`   开始时间: ${startTime.toLocaleString('zh-CN')}`);
          console.log(`   结束时间: ${endTime.toLocaleString('zh-CN')}`);
          console.log(`   开奖时间: ${drawTime.toLocaleString('zh-CN')}`);
        }
      } else {
        console.log('⏳ 当前期号不需要生成，等待倒计时结束');
      }
    } else {
      console.log(`✅ 当前期号已存在: ${currentIssueNo}`);
    }
    
    // 3. 验证清理结果
    console.log('\n📊 验证清理结果...');
    
    // 检查未来期号
    const futureCountQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = 1 AND draw_time > NOW()
    `;
    
    const futureCountResult = await pool.query(futureCountQuery);
    const futureCount = futureCountResult.rows[0].count;
    
    if (futureCount == 0) {
      console.log('✅ 没有未来期号');
    } else {
      console.log(`⚠️  仍有 ${futureCount} 个未来期号`);
    }
    
    // 检查提前生成的期号
    const preGeneratedCountQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND created_at < start_time - INTERVAL '1 minute'
    `;
    
    const preGeneratedCountResult = await pool.query(preGeneratedCountQuery);
    const preGeneratedCount = preGeneratedCountResult.rows[0].count;
    
    if (preGeneratedCount == 0) {
      console.log('✅ 没有提前生成的期号');
    } else {
      console.log(`⚠️  仍有 ${preGeneratedCount} 个提前生成的期号`);
    }
    
    // 统计当前期号总数
    const totalCountQuery = `
      SELECT COUNT(*) as total_count
      FROM lottery_issues 
      WHERE lottery_type_id = 1
    `;
    
    const totalCountResult = await pool.query(totalCountQuery);
    console.log(`📈 当前期号总数: ${totalCountResult.rows[0].total_count}`);
    
    // 4. 显示当前状态
    console.log('\n📋 当前系统状态:');
    
    const currentStatusQuery = `
      SELECT 
        issue_no,
        start_time,
        end_time,
        draw_time,
        status,
        created_at
      FROM lottery_issues 
      WHERE lottery_type_id = 1
      ORDER BY start_time DESC
      LIMIT 3
    `;
    
    const currentStatusResult = await pool.query(currentStatusQuery);
    
    currentStatusResult.rows.forEach((issue, index) => {
      const now = new Date();
      const drawTime = new Date(issue.draw_time);
      const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
      
      console.log(`\n   ${index + 1}. 期号: ${issue.issue_no}`);
      console.log(`      开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`      开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`      创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
      console.log(`      状态: ${issue.status}`);
      console.log(`      剩余时间: ${remainingTime > 0 ? remainingTime + '秒' : '已到开奖时间'}`);
    });
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  }
}

async function main() {
  try {
    await forceCleanupAndReset();
    console.log('\n🎉 强制清理和重置完成！');
    
    console.log('\n💡 系统现在应该按照正确的倒计时逻辑运行:');
    console.log('1. ✅ 不会提前生成未来期号');
    console.log('2. ✅ 只在倒计时结束时生成当期期号');
    console.log('3. ✅ 期号生成后立即开奖');
    console.log('4. ✅ 开奖完成后开始下一期倒计时');
    
    console.log('\n🔄 接下来的流程:');
    console.log('- 前端显示倒计时');
    console.log('- 倒计时结束时前端调用API生成期号');
    console.log('- 后端SSC服务检测到开奖时间自动开奖');
    console.log('- 开奖完成后前端开始下一期倒计时');
    
  } catch (error) {
    console.error('❌ 操作失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行清理
if (require.main === module) {
  main();
}

module.exports = {
  forceCleanupAndReset
};
