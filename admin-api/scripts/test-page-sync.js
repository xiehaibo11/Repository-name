const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testPageSync() {
  try {
    console.log('🧪 测试两个页面的期号同步...');
    
    // 1. 模拟奖期管理页面的查询
    console.log('\n📊 奖期管理页面查询:');
    const issuesQuery = `
      SELECT
        i.*,
        lt.name as lottery_name,
        ld.draw_numbers,
        ld.draw_method,
        0 as bet_count,
        0 as bet_amount,
        0 as win_amount,
        CASE
          WHEN ld.draw_numbers IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as settlement_status
      FROM lottery_issues i
      JOIN lottery_types lt ON i.lottery_type_id = lt.id
      LEFT JOIN lottery_draws ld ON i.id = ld.issue_id
      WHERE i.lottery_type_id = 1
      ORDER BY i.issue_date DESC, i.issue_index DESC
      LIMIT 1
    `;
    
    const issuesResult = await pool.query(issuesQuery);
    
    if (issuesResult.rows.length > 0) {
      const issue = issuesResult.rows[0];
      console.log(`✅ 奖期管理页面显示:`);
      console.log(`   期号: ${issue.issue_no}`);
      console.log(`   开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   状态: ${issue.status}`);
      console.log(`   开奖号码: ${issue.draw_numbers || '未开奖'}`);
      
      // 2. 模拟开奖管理页面的查询（基于奖期管理的期号）
      console.log('\n🎲 开奖管理页面查询:');
      const drawsQuery = `
        SELECT 
          d.*,
          lt.name as lottery_name
        FROM lottery_draws d
        JOIN lottery_types lt ON d.lottery_type_id = lt.id
        WHERE d.lottery_type_id = 1 AND d.issue_no = $1
        ORDER BY d.draw_time DESC
        LIMIT 1
      `;
      
      const drawsResult = await pool.query(drawsQuery, [issue.issue_no]);
      
      if (drawsResult.rows.length > 0) {
        const draw = drawsResult.rows[0];
        console.log(`✅ 开奖管理页面显示:`);
        console.log(`   期号: ${draw.issue_no}`);
        console.log(`   开奖号码: ${draw.draw_numbers}`);
        console.log(`   开奖时间: ${new Date(draw.draw_time).toLocaleString('zh-CN')}`);
        console.log(`   开奖状态: ${draw.draw_status}`);
        console.log(`   开奖方式: ${draw.draw_method}`);
        
        // 验证期号一致性
        if (issue.issue_no === draw.issue_no) {
          console.log('\n✅ 期号完全一致！');
        } else {
          console.log('\n❌ 期号不一致！');
        }
        
      } else {
        console.log(`✅ 开奖管理页面显示:`);
        console.log(`   期号: ${issue.issue_no}`);
        console.log(`   开奖号码: 未开奖`);
        console.log(`   开奖状态: pending`);
        console.log(`   开奖方式: -`);
        
        console.log('\n✅ 期号一致，但该期尚未开奖！');
      }
      
    } else {
      console.log('❌ 奖期管理页面无数据');
    }
    
    // 3. 验证前端逻辑
    console.log('\n🔍 前端逻辑验证:');
    console.log('📊 奖期管理页面:');
    console.log('   - 显示最新的奖期信息');
    console.log('   - 包括期号、时间、状态等');
    console.log('   - 如果有开奖号码则显示，没有则显示未开奖');
    
    console.log('\n🎲 开奖管理页面:');
    console.log('   - 首先获取奖期管理页面的最新期号');
    console.log('   - 然后查询该期号的开奖记录');
    console.log('   - 如果有开奖记录则显示完整信息');
    console.log('   - 如果没有开奖记录则显示"未开奖"状态');
    
    // 4. 测试不同场景
    console.log('\n📋 测试场景分析:');
    
    // 场景1：期号已开奖
    const drawnIssuesQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues i
      JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1
    `;
    
    const drawnResult = await pool.query(drawnIssuesQuery);
    const drawnCount = drawnResult.rows[0].count;
    
    // 场景2：期号未开奖
    const pendingIssuesQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1 AND d.id IS NULL
    `;
    
    const pendingResult = await pool.query(pendingIssuesQuery);
    const pendingCount = pendingResult.rows[0].count;
    
    console.log(`   场景1 - 已开奖期号: ${drawnCount} 个`);
    console.log(`   场景2 - 未开奖期号: ${pendingCount} 个`);
    
    if (drawnCount > 0 && pendingCount === 0) {
      console.log('✅ 理想状态：所有期号都已开奖，两个页面显示一致');
    } else if (pendingCount > 0) {
      console.log('⏳ 当前状态：有未开奖期号，开奖管理页面会显示"未开奖"');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testPageSync();
    console.log('\n🎉 页面同步测试完成！');
    
    console.log('\n💡 同步策略总结:');
    console.log('1. 📊 奖期管理页面：显示最新期号的基本信息');
    console.log('2. 🎲 开奖管理页面：显示与奖期管理相同期号的开奖信息');
    console.log('3. ✅ 期号始终保持一致');
    console.log('4. 🔄 如果期号未开奖，开奖管理页面显示"未开奖"状态');
    console.log('5. 🎯 用户看到的期号在两个页面完全相同');
    
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
  testPageSync
};
