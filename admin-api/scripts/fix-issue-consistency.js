const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function fixIssueConsistency() {
  try {
    console.log('🔧 修复期号一致性问题...');
    
    // 1. 检查当前状态
    console.log('\n📊 当前状态检查:');
    
    // 最新奖期
    const latestIssueQuery = `
      SELECT issue_no, start_time, draw_time, status
      FROM lottery_issues 
      WHERE lottery_type_id = 1
      ORDER BY issue_date DESC, issue_index DESC
      LIMIT 1
    `;
    
    const latestIssueResult = await pool.query(latestIssueQuery);
    const latestIssue = latestIssueResult.rows[0];
    
    console.log(`   最新奖期: ${latestIssue.issue_no}`);
    console.log(`   开奖时间: ${new Date(latestIssue.draw_time).toLocaleString('zh-CN')}`);
    console.log(`   状态: ${latestIssue.status}`);
    
    // 最新开奖记录
    const latestDrawQuery = `
      SELECT issue_no, draw_numbers, draw_time, draw_status
      FROM lottery_draws 
      WHERE lottery_type_id = 1
      ORDER BY draw_time DESC
      LIMIT 1
    `;
    
    const latestDrawResult = await pool.query(latestDrawQuery);
    
    if (latestDrawResult.rows.length > 0) {
      const latestDraw = latestDrawResult.rows[0];
      console.log(`   最新开奖: ${latestDraw.issue_no}`);
      console.log(`   开奖号码: ${latestDraw.draw_numbers}`);
      console.log(`   开奖时间: ${new Date(latestDraw.draw_time).toLocaleString('zh-CN')}`);
    } else {
      console.log('   最新开奖: 无开奖记录');
    }
    
    // 2. 分析问题
    console.log('\n🔍 问题分析:');
    
    if (latestDrawResult.rows.length === 0) {
      console.log('❌ 没有开奖记录，但有奖期记录');
      console.log('   原因: 奖期已生成但未开奖');
      
      // 检查是否到了开奖时间
      const now = new Date();
      const drawTime = new Date(latestIssue.draw_time);
      
      if (now >= drawTime) {
        console.log('⏰ 已到开奖时间，应该进行开奖');
        
        // 为最新期号生成开奖记录
        console.log('\n🎲 为最新期号生成开奖记录...');
        
        // 生成随机开奖号码
        const drawNumbers = [];
        for (let i = 0; i < 5; i++) {
          drawNumbers.push(Math.floor(Math.random() * 10));
        }
        const drawNumbersStr = drawNumbers.join(',');
        
        // 计算和值属性
        const sum = drawNumbers.reduce((acc, num) => acc + num, 0);
        const sumBigSmall = sum >= 23 ? '大' : '小';
        const sumOddEven = sum % 2 === 0 ? '双' : '单';
        
        console.log(`   生成开奖号码: ${drawNumbersStr}`);
        console.log(`   和值: ${sum} (${sumBigSmall}${sumOddEven})`);
        
        // 插入开奖记录
        const insertDrawQuery = `
          INSERT INTO lottery_draws (
            lottery_type_id, issue_id, issue_no, draw_numbers,
            wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
            sum_value, sum_big_small, sum_odd_even,
            draw_method, draw_status, source, draw_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          RETURNING *
        `;
        
        const insertValues = [
          1, // lottery_type_id
          latestIssue.id || (await pool.query('SELECT id FROM lottery_issues WHERE issue_no = $1', [latestIssue.issue_no])).rows[0].id,
          latestIssue.issue_no,
          drawNumbersStr,
          drawNumbers[0], drawNumbers[1], drawNumbers[2], drawNumbers[3], drawNumbers[4],
          sum, sumBigSmall, sumOddEven,
          'auto', 'drawn', '系统自动开奖', new Date().toISOString()
        ];
        
        try {
          const insertResult = await pool.query(insertDrawQuery, insertValues);
          console.log('✅ 开奖记录创建成功');
          
          // 更新奖期状态
          await pool.query('UPDATE lottery_issues SET status = $1 WHERE issue_no = $2', ['drawn', latestIssue.issue_no]);
          console.log('✅ 奖期状态更新为已开奖');
          
        } catch (error) {
          console.error('❌ 创建开奖记录失败:', error.message);
        }
        
      } else {
        const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
        console.log(`⏳ 距离开奖还有 ${remainingTime} 秒，等待自动开奖`);
      }
      
    } else {
      const latestDraw = latestDrawResult.rows[0];
      
      if (latestIssue.issue_no !== latestDraw.issue_no) {
        console.log('❌ 期号不一致');
        console.log(`   奖期管理显示: ${latestIssue.issue_no}`);
        console.log(`   开奖管理显示: ${latestDraw.issue_no}`);
        console.log('   原因: 最新奖期还未开奖');
        
        // 检查最新奖期是否到了开奖时间
        const now = new Date();
        const drawTime = new Date(latestIssue.draw_time);
        
        if (now >= drawTime) {
          console.log('⏰ 最新奖期已到开奖时间，需要开奖');
          // 这里可以触发开奖逻辑，但为了安全起见，我们只提示
          console.log('💡 建议: 等待系统自动开奖或手动触发开奖');
        } else {
          const remainingTime = Math.ceil((drawTime.getTime() - now.getTime()) / 1000);
          console.log(`⏳ 最新奖期距离开奖还有 ${remainingTime} 秒`);
        }
        
      } else {
        console.log('✅ 期号一致，系统正常');
      }
    }
    
    // 3. 验证修复结果
    console.log('\n📋 修复后状态验证:');
    
    // 重新查询最新开奖记录
    const newLatestDrawResult = await pool.query(latestDrawQuery);
    
    if (newLatestDrawResult.rows.length > 0) {
      const newLatestDraw = newLatestDrawResult.rows[0];
      console.log(`   最新开奖期号: ${newLatestDraw.issue_no}`);
      console.log(`   最新奖期期号: ${latestIssue.issue_no}`);
      
      if (latestIssue.issue_no === newLatestDraw.issue_no) {
        console.log('✅ 期号现在一致了');
      } else {
        console.log('⚠️  期号仍不一致，这是正常的（最新奖期还未开奖）');
      }
    }
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  }
}

async function main() {
  try {
    await fixIssueConsistency();
    console.log('\n🎉 期号一致性修复完成！');
    
    console.log('\n💡 说明:');
    console.log('📊 奖期管理页面: 显示最新的奖期（包括未开奖的）');
    console.log('🎲 开奖管理页面: 显示最新的开奖记录（已开奖的）');
    console.log('⏰ 如果最新奖期还未到开奖时间，两个页面显示的期号会不同');
    console.log('✅ 这是正常现象，不是bug');
    
  } catch (error) {
    console.error('❌ 修复失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行修复
if (require.main === module) {
  main();
}

module.exports = {
  fixIssueConsistency
};
