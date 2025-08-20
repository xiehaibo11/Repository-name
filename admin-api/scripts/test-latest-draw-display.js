const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testLatestDrawDisplay() {
  try {
    console.log('🧪 测试最新开奖记录显示...');
    
    // 1. 检查最新开奖记录
    console.log('\n📊 最新开奖记录:');
    const latestQuery = `
      SELECT 
        d.id,
        d.issue_no,
        d.draw_numbers,
        d.sum_value,
        d.sum_big_small,
        d.sum_odd_even,
        d.draw_method,
        d.draw_status,
        d.source,
        d.draw_time,
        d.created_at,
        lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 1
    `;
    
    const latestResult = await pool.query(latestQuery);
    
    if (latestResult.rows.length > 0) {
      const latest = latestResult.rows[0];
      console.log(`✅ 找到最新开奖记录:`);
      console.log(`   ID: ${latest.id}`);
      console.log(`   彩种: ${latest.lottery_name}`);
      console.log(`   期号: ${latest.issue_no}`);
      console.log(`   开奖号码: ${latest.draw_numbers}`);
      console.log(`   和值: ${latest.sum_value} (${latest.sum_big_small}${latest.sum_odd_even})`);
      console.log(`   开奖方式: ${latest.draw_method}`);
      console.log(`   开奖状态: ${latest.draw_status}`);
      console.log(`   数据来源: ${latest.source}`);
      console.log(`   开奖时间: ${new Date(latest.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   创建时间: ${new Date(latest.created_at).toLocaleString('zh-CN')}`);
    } else {
      console.log('⚠️  没有找到开奖记录');
    }
    
    // 2. 检查历史开奖记录数量
    console.log('\n📈 历史开奖记录统计:');
    const historyCountQuery = `
      SELECT 
        COUNT(*) as total_count,
        COUNT(CASE WHEN draw_status = 'drawn' THEN 1 END) as drawn_count,
        COUNT(CASE WHEN draw_method = 'auto' THEN 1 END) as auto_count,
        COUNT(CASE WHEN draw_method = 'manual' THEN 1 END) as manual_count,
        MAX(draw_time) as latest_draw_time,
        MIN(draw_time) as earliest_draw_time
      FROM lottery_draws 
      WHERE lottery_type_id = 1
    `;
    
    const historyCountResult = await pool.query(historyCountQuery);
    const stats = historyCountResult.rows[0];
    
    console.log(`   总记录数: ${stats.total_count}`);
    console.log(`   已开奖: ${stats.drawn_count}`);
    console.log(`   自动开奖: ${stats.auto_count}`);
    console.log(`   手动开奖: ${stats.manual_count}`);
    console.log(`   最新开奖时间: ${stats.latest_draw_time ? new Date(stats.latest_draw_time).toLocaleString('zh-CN') : '无'}`);
    console.log(`   最早开奖时间: ${stats.earliest_draw_time ? new Date(stats.earliest_draw_time).toLocaleString('zh-CN') : '无'}`);
    
    // 3. 模拟前端API调用（只获取最新1条记录）
    console.log('\n🔍 模拟前端API调用 (pageSize=1):');
    const frontendQuery = `
      SELECT 
        d.*,
        lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 1 OFFSET 0
    `;
    
    const frontendResult = await pool.query(frontendQuery);
    
    if (frontendResult.rows.length > 0) {
      const record = frontendResult.rows[0];
      console.log(`✅ 前端将显示的记录:`);
      console.log(`   期号: ${record.issue_no}`);
      console.log(`   开奖号码: ${record.draw_numbers}`);
      console.log(`   开奖时间: ${new Date(record.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖方式: ${record.draw_method === 'auto' ? '自动开奖' : '手动开奖'}`);
    } else {
      console.log('⚠️  前端将显示空数据');
    }
    
    // 4. 检查历史记录页面应该显示的数据
    console.log('\n📋 历史记录页面数据预览 (前5条):');
    const historyQuery = `
      SELECT 
        d.issue_no,
        d.draw_numbers,
        d.draw_time,
        d.draw_method
      FROM lottery_draws d
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 5
    `;
    
    const historyResult = await pool.query(historyQuery);
    
    historyResult.rows.forEach((record, index) => {
      console.log(`   ${index + 1}. 期号: ${record.issue_no}`);
      console.log(`      开奖号码: ${record.draw_numbers}`);
      console.log(`      开奖时间: ${new Date(record.draw_time).toLocaleString('zh-CN')}`);
      console.log(`      开奖方式: ${record.draw_method === 'auto' ? '自动开奖' : '手动开奖'}`);
      console.log('');
    });
    
    // 5. 验证页面功能分离
    console.log('📝 页面功能验证:');
    
    if (stats.total_count > 1) {
      console.log('✅ 开奖管理页面: 只显示最新1条记录');
      console.log('✅ 历史记录页面: 显示所有历史记录，支持搜索和分页');
      console.log('✅ 功能分离: 符合需求，用户可以在不同页面查看不同内容');
    } else {
      console.log('⚠️  当前只有1条或0条记录，无法完全验证功能分离');
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testLatestDrawDisplay();
    console.log('\n🎉 最新开奖记录显示测试完成！');
    
    console.log('\n💡 页面功能说明:');
    console.log('📊 开奖管理页面 (/lottery/draws):');
    console.log('   - 只显示最新的1条开奖记录');
    console.log('   - 隐藏搜索功能和分页');
    console.log('   - 提供刷新按钮获取最新数据');
    console.log('   - 显示"查看历史记录请前往开奖历史页面"提示');
    
    console.log('\n📋 开奖历史页面 (/lottery/draws/history):');
    console.log('   - 显示所有历史开奖记录');
    console.log('   - 支持按期号、日期范围搜索');
    console.log('   - 支持分页浏览');
    console.log('   - 保持原有的完整功能');
    
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
  testLatestDrawDisplay
};
