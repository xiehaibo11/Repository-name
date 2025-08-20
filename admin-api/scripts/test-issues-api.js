const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function testIssuesAPI() {
  try {
    console.log('🧪 测试奖期管理API...');
    
    // 1. 直接查询数据库，模拟后端API逻辑
    console.log('\n📊 模拟后端getIssues API查询:');
    const apiQuery = `
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
      WHERE i.lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      ORDER BY i.issue_date DESC, i.issue_index DESC
      LIMIT 1
    `;
    
    const apiResult = await pool.query(apiQuery);
    
    if (apiResult.rows.length > 0) {
      const issue = apiResult.rows[0];
      console.log(`✅ API应该返回的数据:`);
      console.log(`   期号: ${issue.issue_no}`);
      console.log(`   开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   状态: ${issue.status}`);
      console.log(`   开奖号码: ${issue.draw_numbers || '未开奖'}`);
      console.log(`   结算状态: ${issue.settlement_status}`);
    } else {
      console.log('⚠️  API查询无结果');
    }
    
    // 2. 检查是否有期号为 2507261859 的记录
    console.log('\n🔍 检查期号 2507261859:');
    const specificQuery = `
      SELECT * FROM lottery_issues 
      WHERE issue_no = '2507261859'
    `;
    
    const specificResult = await pool.query(specificQuery);
    
    if (specificResult.rows.length > 0) {
      const issue = specificResult.rows[0];
      console.log(`✅ 找到期号 2507261859:`);
      console.log(`   ID: ${issue.id}`);
      console.log(`   开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   状态: ${issue.status}`);
      console.log(`   创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
    } else {
      console.log('❌ 数据库中不存在期号 2507261859');
      console.log('   这说明前端显示的数据可能来自缓存或其他数据源');
    }
    
    // 3. 检查所有期号，找出最新的
    console.log('\n📋 所有期号列表（按时间倒序）:');
    const allIssuesQuery = `
      SELECT 
        issue_no,
        start_time,
        draw_time,
        status,
        created_at
      FROM lottery_issues 
      WHERE lottery_type_id = 1
      ORDER BY issue_date DESC, issue_index DESC
      LIMIT 10
    `;
    
    const allIssuesResult = await pool.query(allIssuesQuery);
    
    allIssuesResult.rows.forEach((issue, index) => {
      console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
      console.log(`      开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`      状态: ${issue.status}`);
      console.log(`      创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
    // 4. 检查是否有其他表或数据源
    console.log('🔍 检查可能的数据源:');
    
    // 检查是否有其他相关表
    const tablesQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE '%issue%' 
        OR table_name LIKE '%lottery%'
      ORDER BY table_name
    `;
    
    const tablesResult = await pool.query(tablesQuery);
    
    console.log('   相关数据表:');
    tablesResult.rows.forEach(table => {
      console.log(`   - ${table.table_name}`);
    });
    
    // 5. 检查前端可能的数据来源
    console.log('\n💡 问题分析:');
    console.log('   1. 数据库中最新期号: 2507261607');
    console.log('   2. 前端显示期号: 2507261859');
    console.log('   3. 可能的原因:');
    console.log('      - 前端缓存了旧数据');
    console.log('      - 前端调用了错误的API');
    console.log('      - 存在其他数据源');
    console.log('      - 前端本地生成了期号但未同步到后端');
    
    // 6. 建议的解决方案
    console.log('\n🔧 建议的解决方案:');
    console.log('   1. 清除前端缓存，刷新页面');
    console.log('   2. 检查前端是否调用了正确的API');
    console.log('   3. 确保前端和后端数据同步');
    console.log('   4. 如果期号 2507261859 是正确的，需要在数据库中创建对应记录');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  }
}

async function main() {
  try {
    await testIssuesAPI();
    console.log('\n🎉 奖期管理API测试完成！');
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
  testIssuesAPI
};
