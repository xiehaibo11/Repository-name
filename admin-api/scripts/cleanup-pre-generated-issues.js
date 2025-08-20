const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function cleanupPreGeneratedIssues() {
  try {
    console.log('🧹 清理提前生成的期号...');
    
    // 1. 查找提前生成的期号（未来的期号）
    console.log('\n📅 查找未来期号:');
    const futureIssuesQuery = `
      SELECT 
        id,
        issue_no,
        start_time,
        draw_time,
        status,
        created_at
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND draw_time > NOW()
      ORDER BY draw_time ASC
    `;
    
    const futureResult = await pool.query(futureIssuesQuery);
    
    if (futureResult.rows.length > 0) {
      console.log(`⚠️  发现 ${futureResult.rows.length} 个未来期号:`);
      futureResult.rows.forEach((issue, index) => {
        console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
        console.log(`      开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
        console.log(`      创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
        console.log(`      状态: ${issue.status}`);
      });
      
      // 删除未来期号
      console.log('\n🗑️ 删除未来期号...');
      const deleteQuery = `
        DELETE FROM lottery_issues 
        WHERE lottery_type_id = 1 
          AND draw_time > NOW()
          AND status = 'pending'
      `;
      
      const deleteResult = await pool.query(deleteQuery);
      console.log(`✅ 删除了 ${deleteResult.rowCount} 个未来期号`);
      
    } else {
      console.log('✅ 没有发现未来期号');
    }
    
    // 2. 查找提前生成的期号（创建时间早于开始时间1分钟以上）
    console.log('\n📊 查找提前生成的期号:');
    const preGeneratedQuery = `
      SELECT 
        id,
        issue_no,
        start_time,
        draw_time,
        status,
        created_at,
        EXTRACT(EPOCH FROM (start_time - created_at)) / 60 as minutes_early
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND created_at < start_time - INTERVAL '1 minute'
        AND status = 'pending'
      ORDER BY start_time ASC
    `;
    
    const preGeneratedResult = await pool.query(preGeneratedQuery);
    
    if (preGeneratedResult.rows.length > 0) {
      console.log(`⚠️  发现 ${preGeneratedResult.rows.length} 个提前生成的期号:`);
      preGeneratedResult.rows.forEach((issue, index) => {
        console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
        console.log(`      开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
        console.log(`      创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
        console.log(`      提前时间: ${Math.round(issue.minutes_early)} 分钟`);
        console.log(`      状态: ${issue.status}`);
      });
      
      // 删除提前生成的期号（保留已开奖的）
      console.log('\n🗑️ 删除提前生成的未开奖期号...');
      const deletePreGeneratedQuery = `
        DELETE FROM lottery_issues 
        WHERE lottery_type_id = 1 
          AND created_at < start_time - INTERVAL '1 minute'
          AND status = 'pending'
          AND id NOT IN (SELECT DISTINCT issue_id FROM lottery_draws WHERE issue_id IS NOT NULL)
      `;
      
      const deletePreGeneratedResult = await pool.query(deletePreGeneratedQuery);
      console.log(`✅ 删除了 ${deletePreGeneratedResult.rowCount} 个提前生成的期号`);
      
    } else {
      console.log('✅ 没有发现提前生成的期号');
    }
    
    // 3. 检查当前应该存在的期号
    console.log('\n🔍 检查当前期号状态:');
    const now = new Date();
    const currentMinute = new Date(now);
    currentMinute.setSeconds(0, 0); // 当前分钟
    
    const year = String(currentMinute.getFullYear()).slice(-2);
    const month = String(currentMinute.getMonth() + 1).padStart(2, '0');
    const day = String(currentMinute.getDate()).padStart(2, '0');
    const hours = String(currentMinute.getHours()).padStart(2, '0');
    const minutes = String(currentMinute.getMinutes()).padStart(2, '0');
    const currentIssueNo = `${year}${month}${day}${hours}${minutes}`;
    
    console.log(`   当前时间: ${now.toLocaleString('zh-CN')}`);
    console.log(`   当前期号应该是: ${currentIssueNo}`);
    
    const currentIssueQuery = `
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = 1 AND issue_no = $1
    `;
    
    const currentIssueResult = await pool.query(currentIssueQuery, [currentIssueNo]);
    
    if (currentIssueResult.rows.length > 0) {
      const current = currentIssueResult.rows[0];
      console.log(`   ✅ 当前期号存在: ${current.issue_no}`);
      console.log(`   状态: ${current.status}`);
      console.log(`   开奖时间: ${new Date(current.draw_time).toLocaleString('zh-CN')}`);
    } else {
      console.log(`   ⚠️  当前期号不存在，需要等待倒计时结束生成`);
    }
    
    // 4. 验证清理结果
    console.log('\n📋 验证清理结果:');
    
    // 检查是否还有未来期号
    const remainingFutureQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = 1 AND draw_time > NOW()
    `;
    
    const remainingFutureResult = await pool.query(remainingFutureQuery);
    const remainingFutureCount = remainingFutureResult.rows[0].count;
    
    if (remainingFutureCount == 0) {
      console.log('✅ 没有剩余的未来期号');
    } else {
      console.log(`⚠️  仍有 ${remainingFutureCount} 个未来期号`);
    }
    
    // 检查是否还有提前生成的期号
    const remainingPreGeneratedQuery = `
      SELECT COUNT(*) as count
      FROM lottery_issues 
      WHERE lottery_type_id = 1 
        AND created_at < start_time - INTERVAL '1 minute'
        AND status = 'pending'
    `;
    
    const remainingPreGeneratedResult = await pool.query(remainingPreGeneratedQuery);
    const remainingPreGeneratedCount = remainingPreGeneratedResult.rows[0].count;
    
    if (remainingPreGeneratedCount == 0) {
      console.log('✅ 没有剩余的提前生成期号');
    } else {
      console.log(`⚠️  仍有 ${remainingPreGeneratedCount} 个提前生成的期号`);
    }
    
    // 统计当前期号数量
    const totalQuery = `
      SELECT COUNT(*) as total_count
      FROM lottery_issues 
      WHERE lottery_type_id = 1
    `;
    
    const totalResult = await pool.query(totalQuery);
    console.log(`📊 清理后期号总数: ${totalResult.rows[0].total_count}`);
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  }
}

async function main() {
  try {
    await cleanupPreGeneratedIssues();
    console.log('\n🎉 提前生成期号清理完成！');
    
    console.log('\n💡 现在系统应该按照正确的逻辑运行:');
    console.log('1. 不会提前生成未来期号');
    console.log('2. 只在倒计时结束时生成当期期号');
    console.log('3. 期号生成后立即开奖');
    console.log('4. 开奖完成后开始下一期倒计时');
    
  } catch (error) {
    console.error('❌ 清理失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行清理
if (require.main === module) {
  main();
}

module.exports = {
  cleanupPreGeneratedIssues
};
