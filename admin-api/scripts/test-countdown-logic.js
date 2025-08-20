const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testCountdownLogic() {
  try {
    console.log('🧪 测试倒计时结束生成逻辑...');
    
    // 1. 检查当前是否有未来的期号（不应该有）
    console.log('\n📅 检查未来期号:');
    const futureIssuesQuery = `
      SELECT 
        issue_no,
        start_time,
        draw_time,
        status
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND draw_time > NOW()
      ORDER BY draw_time ASC
    `;
    
    const futureResult = await pool.query(futureIssuesQuery);
    
    if (futureResult.rows.length > 0) {
      console.log(`⚠️  发现 ${futureResult.rows.length} 个未来期号（不符合倒计时结束生成逻辑）:`);
      futureResult.rows.forEach((issue, index) => {
        console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
        console.log(`      开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
        console.log(`      状态: ${issue.status}`);
      });
    } else {
      console.log('✅ 没有未来期号，符合倒计时结束生成逻辑');
    }
    
    // 2. 检查当前期号状态
    console.log('\n📊 当前期号状态:');
    const currentIssueQuery = `
      SELECT 
        issue_no,
        start_time,
        end_time,
        draw_time,
        status
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND status = 'pending'
      ORDER BY draw_time ASC
      LIMIT 1
    `;
    
    const currentResult = await pool.query(currentIssueQuery);
    
    if (currentResult.rows.length > 0) {
      const current = currentResult.rows[0];
      const now = new Date();
      const drawTime = new Date(current.draw_time);
      const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
      
      console.log(`   当前期号: ${current.issue_no}`);
      console.log(`   开始时间: ${new Date(current.start_time).toLocaleString('zh-CN')}`);
      console.log(`   结束时间: ${new Date(current.end_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(current.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   剩余时间: ${remainingTime > 0 ? remainingTime + '秒' : '已到开奖时间'}`);
      console.log(`   期号状态: ${current.status}`);
      
      if (remainingTime <= 0) {
        console.log('⏰ 当前期号已到开奖时间，应该进行开奖');
      } else {
        console.log(`⏳ 距离开奖还有 ${remainingTime} 秒`);
      }
    } else {
      console.log('⚠️  没有找到待开奖的期号');
      console.log('💡 这意味着需要等待倒计时结束后生成新期号');
    }
    
    // 3. 检查最近的开奖记录和期号生成时间
    console.log('\n🎲 最近开奖记录和生成时间:');
    const recentQuery = `
      SELECT 
        i.issue_no,
        i.start_time,
        i.draw_time,
        i.created_at as issue_created_at,
        d.draw_numbers,
        d.draw_time as actual_draw_time,
        d.created_at as draw_created_at
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1
      ORDER BY i.start_time DESC
      LIMIT 5
    `;
    
    const recentResult = await pool.query(recentQuery);
    
    recentResult.rows.forEach((record, index) => {
      console.log(`\n   ${index + 1}. 期号: ${record.issue_no}`);
      console.log(`      期号创建时间: ${new Date(record.issue_created_at).toLocaleString('zh-CN')}`);
      console.log(`      开始时间: ${new Date(record.start_time).toLocaleString('zh-CN')}`);
      console.log(`      开奖时间: ${new Date(record.draw_time).toLocaleString('zh-CN')}`);
      
      if (record.draw_numbers) {
        console.log(`      开奖号码: ${record.draw_numbers}`);
        console.log(`      开奖记录创建时间: ${new Date(record.draw_created_at).toLocaleString('zh-CN')}`);
        
        // 检查期号创建时间和开奖时间的关系
        const issueCreated = new Date(record.issue_created_at);
        const drawTime = new Date(record.draw_time);
        const drawCreated = new Date(record.draw_created_at);
        
        if (issueCreated <= drawTime && drawCreated >= drawTime) {
          console.log('      ✅ 时间逻辑正确：期号在开奖前创建，开奖在开奖时间后进行');
        } else {
          console.log('      ⚠️  时间逻辑异常');
        }
      } else {
        console.log('      ⏳ 未开奖');
      }
    });
    
    // 4. 模拟倒计时结束的场景
    console.log('\n🔄 模拟倒计时结束场景:');
    
    const now = new Date();
    const nextMinute = new Date(now);
    nextMinute.setMinutes(now.getMinutes() + 1, 0, 0); // 下一分钟
    
    console.log(`   当前时间: ${now.toLocaleString('zh-CN')}`);
    console.log(`   下一期开奖时间: ${nextMinute.toLocaleString('zh-CN')}`);
    
    // 检查是否已经有这个时间的期号
    const year = String(nextMinute.getFullYear()).slice(-2);
    const month = String(nextMinute.getMonth() + 1).padStart(2, '0');
    const day = String(nextMinute.getDate()).padStart(2, '0');
    const hours = String(nextMinute.getHours()).padStart(2, '0');
    const minutes = String(nextMinute.getMinutes()).padStart(2, '0');
    const nextIssueNo = `${year}${month}${day}${hours}${minutes}`;
    
    const existingQuery = `
      SELECT id FROM lottery_issues 
      WHERE lottery_type_id = 1 AND issue_no = $1
    `;
    
    const existingResult = await pool.query(existingQuery, [nextIssueNo]);
    
    if (existingResult.rows.length > 0) {
      console.log(`   ⚠️  期号 ${nextIssueNo} 已存在（不符合倒计时结束生成逻辑）`);
    } else {
      console.log(`   ✅ 期号 ${nextIssueNo} 不存在，符合倒计时结束生成逻辑`);
    }
    
    // 5. 检查系统是否按照正确的逻辑运行
    console.log('\n📋 系统逻辑检查:');
    
    // 检查是否有提前生成的期号
    const preGeneratedQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND created_at < start_time - INTERVAL '1 minute'
    `;
    
    const preGeneratedResult = await pool.query(preGeneratedQuery);
    const preGeneratedCount = preGeneratedResult.rows[0].count;
    
    if (preGeneratedCount > 0) {
      console.log(`   ⚠️  发现 ${preGeneratedCount} 个提前生成的期号（不符合倒计时结束生成逻辑）`);
    } else {
      console.log('   ✅ 没有提前生成的期号，符合倒计时结束生成逻辑');
    }
    
    // 检查开奖是否在正确时间进行
    const drawTimingQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN d.created_at >= i.draw_time THEN 1 END) as correct_timing
      FROM lottery_issues i
      JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1
    `;
    
    const drawTimingResult = await pool.query(drawTimingQuery);
    const timing = drawTimingResult.rows[0];
    
    console.log(`   开奖时间检查: ${timing.correct_timing}/${timing.total} 期在正确时间开奖`);
    
    if (timing.correct_timing == timing.total) {
      console.log('   ✅ 所有开奖都在正确时间进行');
    } else {
      console.log('   ⚠️  部分开奖时间不正确');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testCountdownLogic();
    console.log('\n🎉 倒计时逻辑测试完成！');
    
    console.log('\n💡 正确的倒计时结束生成逻辑应该是:');
    console.log('1. 系统不提前生成未来期号');
    console.log('2. 倒计时结束时才生成当期期号');
    console.log('3. 期号生成后立即进行开奖');
    console.log('4. 开奖完成后开始下一期倒计时');
    
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
  testCountdownLogic
};
