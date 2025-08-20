const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function checkIssueConsistency() {
  try {
    console.log('🔍 检查期号一致性问题...');
    
    // 1. 检查最新的奖期记录
    console.log('\n📅 最新奖期记录:');
    const latestIssueQuery = `
      SELECT 
        id,
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
    
    const latestIssueResult = await pool.query(latestIssueQuery);
    
    latestIssueResult.rows.forEach((issue, index) => {
      console.log(`   ${index + 1}. 期号: ${issue.issue_no}`);
      console.log(`      开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`      开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`      状态: ${issue.status}`);
      console.log(`      创建时间: ${new Date(issue.created_at).toLocaleString('zh-CN')}`);
      console.log('');
    });
    
    // 2. 检查最新的开奖记录
    console.log('🎲 最新开奖记录:');
    const latestDrawQuery = `
      SELECT 
        d.id,
        d.issue_no,
        d.draw_numbers,
        d.draw_time,
        d.draw_status,
        d.created_at,
        i.issue_no as issue_table_no,
        i.start_time as issue_start_time
      FROM lottery_draws d
      LEFT JOIN lottery_issues i ON d.issue_id = i.id
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 3
    `;
    
    const latestDrawResult = await pool.query(latestDrawQuery);
    
    latestDrawResult.rows.forEach((draw, index) => {
      console.log(`   ${index + 1}. 开奖期号: ${draw.issue_no}`);
      console.log(`      对应奖期期号: ${draw.issue_table_no || '无关联'}`);
      console.log(`      开奖号码: ${draw.draw_numbers}`);
      console.log(`      开奖时间: ${new Date(draw.draw_time).toLocaleString('zh-CN')}`);
      console.log(`      开奖状态: ${draw.draw_status}`);
      console.log(`      创建时间: ${new Date(draw.created_at).toLocaleString('zh-CN')}`);
      
      if (draw.issue_no === draw.issue_table_no) {
        console.log(`      ✅ 期号匹配`);
      } else {
        console.log(`      ❌ 期号不匹配`);
      }
      console.log('');
    });
    
    // 3. 检查奖期管理页面应该显示的数据（最新的pending期号）
    console.log('📊 奖期管理页面应该显示的数据:');
    const issuePageQuery = `
      SELECT 
        id,
        issue_no,
        start_time,
        end_time,
        draw_time,
        status
      FROM lottery_issues 
      WHERE lottery_type_id = 1
      ORDER BY start_time DESC
      LIMIT 1
    `;
    
    const issuePageResult = await pool.query(issuePageQuery);
    
    if (issuePageResult.rows.length > 0) {
      const issue = issuePageResult.rows[0];
      console.log(`   期号: ${issue.issue_no}`);
      console.log(`   开始时间: ${new Date(issue.start_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖时间: ${new Date(issue.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   状态: ${issue.status}`);
    }
    
    // 4. 检查开奖管理页面应该显示的数据（最新的开奖记录）
    console.log('\n🎯 开奖管理页面应该显示的数据:');
    const drawPageQuery = `
      SELECT 
        d.issue_no,
        d.draw_numbers,
        d.draw_time,
        d.draw_status
      FROM lottery_draws d
      WHERE d.lottery_type_id = 1
      ORDER BY d.draw_time DESC
      LIMIT 1
    `;
    
    const drawPageResult = await pool.query(drawPageQuery);
    
    if (drawPageResult.rows.length > 0) {
      const draw = drawPageResult.rows[0];
      console.log(`   期号: ${draw.issue_no}`);
      console.log(`   开奖号码: ${draw.draw_numbers}`);
      console.log(`   开奖时间: ${new Date(draw.draw_time).toLocaleString('zh-CN')}`);
      console.log(`   开奖状态: ${draw.draw_status}`);
    }
    
    // 5. 分析期号不一致的原因
    console.log('\n🔍 期号不一致原因分析:');
    
    const latestIssueNo = issuePageResult.rows[0]?.issue_no;
    const latestDrawNo = drawPageResult.rows[0]?.issue_no;
    
    console.log(`   奖期管理最新期号: ${latestIssueNo}`);
    console.log(`   开奖管理最新期号: ${latestDrawNo}`);
    
    if (latestIssueNo !== latestDrawNo) {
      console.log('\n❌ 发现期号不一致问题:');
      
      // 检查是否有未开奖的期号
      const pendingIssueQuery = `
        SELECT COUNT(*) as count
        FROM lottery_issues 
        WHERE lottery_type_id = 1 AND status = 'pending'
          AND id NOT IN (SELECT DISTINCT issue_id FROM lottery_draws WHERE issue_id IS NOT NULL)
      `;
      
      const pendingResult = await pool.query(pendingIssueQuery);
      const pendingCount = pendingResult.rows[0].count;
      
      if (pendingCount > 0) {
        console.log(`   - 有 ${pendingCount} 个期号还未开奖`);
        console.log('   - 奖期管理显示最新期号（包括未开奖）');
        console.log('   - 开奖管理显示最新开奖记录（已开奖）');
        console.log('   - 这是正常现象，说明系统正在等待开奖');
      } else {
        console.log('   - 所有期号都已开奖，但期号仍不一致');
        console.log('   - 可能存在数据同步问题');
      }
      
      // 检查时间差
      if (issuePageResult.rows[0] && drawPageResult.rows[0]) {
        const issueTime = new Date(issuePageResult.rows[0].start_time);
        const drawTime = new Date(drawPageResult.rows[0].draw_time);
        const timeDiff = Math.abs(issueTime.getTime() - drawTime.getTime()) / (1000 * 60);
        
        console.log(`   - 时间差: ${Math.round(timeDiff)} 分钟`);
        
        if (timeDiff > 60) {
          console.log('   - 时间差较大，可能需要生成新的期号或开奖');
        }
      }
    } else {
      console.log('✅ 期号一致，系统正常');
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  }
}

async function main() {
  try {
    await checkIssueConsistency();
    console.log('\n🎉 期号一致性检查完成！');
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行检查
if (require.main === module) {
  main();
}

module.exports = {
  checkIssueConsistency
};
