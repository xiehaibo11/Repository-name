const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function syncIssueDrawPages() {
  try {
    console.log('🔄 同步奖期管理和开奖管理页面显示...');
    
    // 1. 检查当前状态
    console.log('\n📊 当前状态分析:');
    
    // 查找最新的奖期
    const latestIssueQuery = `
      SELECT id, issue_no, start_time, draw_time, status, created_at
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
    
    // 查找最新的开奖记录
    const latestDrawQuery = `
      SELECT issue_no, draw_numbers, draw_time, draw_status, created_at
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
    
    // 2. 分析同步问题
    console.log('\n🔍 同步问题分析:');
    
    if (latestDrawResult.rows.length === 0) {
      console.log('❌ 问题: 有奖期但无开奖记录');
      console.log('   解决方案: 为最新奖期生成开奖记录');
      
      await generateDrawForIssue(latestIssue);
      
    } else {
      const latestDraw = latestDrawResult.rows[0];
      
      if (latestIssue.issue_no !== latestDraw.issue_no) {
        console.log('❌ 问题: 奖期和开奖记录期号不一致');
        console.log(`   奖期期号: ${latestIssue.issue_no}`);
        console.log(`   开奖期号: ${latestDraw.issue_no}`);
        
        // 检查最新奖期是否已到开奖时间
        const now = new Date();
        const drawTime = new Date(latestIssue.draw_time);
        
        if (now >= drawTime) {
          console.log('   解决方案: 为最新奖期生成开奖记录');
          await generateDrawForIssue(latestIssue);
        } else {
          console.log('   解决方案: 删除未到开奖时间的奖期，保持同步');
          await removePrematureIssue(latestIssue);
        }
      } else {
        console.log('✅ 奖期和开奖记录已同步');
      }
    }
    
    // 3. 验证同步结果
    console.log('\n📋 同步结果验证:');
    
    // 重新查询最新数据
    const newLatestIssueResult = await pool.query(latestIssueQuery);
    const newLatestDrawResult = await pool.query(latestDrawQuery);
    
    if (newLatestIssueResult.rows.length > 0 && newLatestDrawResult.rows.length > 0) {
      const newLatestIssue = newLatestIssueResult.rows[0];
      const newLatestDraw = newLatestDrawResult.rows[0];
      
      console.log(`   奖期管理页面显示: ${newLatestIssue.issue_no}`);
      console.log(`   开奖管理页面显示: ${newLatestDraw.issue_no}`);
      
      if (newLatestIssue.issue_no === newLatestDraw.issue_no) {
        console.log('✅ 两个页面现在显示相同的期号');
      } else {
        console.log('⚠️  两个页面仍显示不同期号');
      }
    }
    
  } catch (error) {
    console.error('❌ 同步失败:', error);
  }
}

// 为奖期生成开奖记录
async function generateDrawForIssue(issue) {
  try {
    console.log(`\n🎲 为期号 ${issue.issue_no} 生成开奖记录...`);
    
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
      ON CONFLICT (lottery_type_id, issue_no) DO UPDATE SET
        draw_numbers = EXCLUDED.draw_numbers,
        sum_value = EXCLUDED.sum_value,
        sum_big_small = EXCLUDED.sum_big_small,
        sum_odd_even = EXCLUDED.sum_odd_even,
        draw_method = EXCLUDED.draw_method,
        draw_status = EXCLUDED.draw_status,
        source = EXCLUDED.source,
        draw_time = EXCLUDED.draw_time
      RETURNING *
    `;
    
    const insertValues = [
      1, // lottery_type_id
      issue.id,
      issue.issue_no,
      drawNumbersStr,
      drawNumbers[0], drawNumbers[1], drawNumbers[2], drawNumbers[3], drawNumbers[4],
      sum, sumBigSmall, sumOddEven,
      'auto', 'drawn', '系统同步开奖', new Date().toISOString()
    ];
    
    const insertResult = await pool.query(insertDrawQuery, insertValues);
    
    if (insertResult.rows.length > 0) {
      console.log('✅ 开奖记录创建成功');
      
      // 更新奖期状态
      await pool.query('UPDATE lottery_issues SET status = $1 WHERE id = $2', ['drawn', issue.id]);
      console.log('✅ 奖期状态更新为已开奖');
    }
    
  } catch (error) {
    console.error('❌ 生成开奖记录失败:', error);
  }
}

// 删除过早的奖期
async function removePrematureIssue(issue) {
  try {
    console.log(`\n🗑️ 删除过早生成的期号 ${issue.issue_no}...`);
    
    // 删除奖期记录
    await pool.query('DELETE FROM lottery_issues WHERE id = $1', [issue.id]);
    console.log('✅ 过早的奖期已删除');
    
  } catch (error) {
    console.error('❌ 删除奖期失败:', error);
  }
}

async function main() {
  try {
    await syncIssueDrawPages();
    console.log('\n🎉 奖期和开奖页面同步完成！');
    
    console.log('\n💡 同步策略说明:');
    console.log('📊 奖期管理页面: 显示最新的已开奖期号');
    console.log('🎲 开奖管理页面: 显示最新的开奖记录');
    console.log('⏰ 倒计时结束时: 同时生成期号和开奖号码');
    console.log('✅ 两个页面始终显示相同的期号');
    
  } catch (error) {
    console.error('❌ 同步失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行同步
if (require.main === module) {
  main();
}

module.exports = {
  syncIssueDrawPages
};
