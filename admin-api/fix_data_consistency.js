const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function fixDataConsistency() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🔧 开始修复数据一致性问题...');
    
    // 1. 检查并修复期号状态
    console.log('1. 检查期号状态一致性...');
    const inconsistentIssues = await client.query(`
      SELECT i.id, i.issue_no, i.status as issue_status, d.draw_status
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE (i.status = 'drawn' AND d.draw_status IS NULL)
         OR (i.status = 'pending' AND d.draw_status = 'drawn')
         OR (i.status != 'drawn' AND d.draw_status = 'drawn')
    `);
    
    console.log(`发现 ${inconsistentIssues.rows.length} 个状态不一致的期号`);
    
    // 修复状态不一致
    for (const issue of inconsistentIssues.rows) {
      if (issue.draw_status === 'drawn') {
        // 如果有开奖记录，更新期号状态为已开奖
        await client.query(
          'UPDATE lottery_issues SET status = $1 WHERE id = $2',
          ['drawn', issue.id]
        );
        console.log(`✅ 修复期号 ${issue.issue_no} 状态: pending -> drawn`);
      } else if (issue.issue_status === 'drawn' && !issue.draw_status) {
        // 如果期号标记为已开奖但没有开奖记录，重置为待开奖
        await client.query(
          'UPDATE lottery_issues SET status = $1 WHERE id = $2',
          ['pending', issue.id]
        );
        console.log(`✅ 修复期号 ${issue.issue_no} 状态: drawn -> pending`);
      }
    }
    
    // 2. 检查重复的开奖记录
    console.log('2. 检查重复开奖记录...');
    const duplicateDraws = await client.query(`
      SELECT issue_no, COUNT(*) as count
      FROM lottery_draws
      WHERE lottery_type_id = 1
      GROUP BY issue_no
      HAVING COUNT(*) > 1
    `);
    
    console.log(`发现 ${duplicateDraws.rows.length} 个重复开奖记录`);
    
    // 删除重复记录，保留最新的
    for (const duplicate of duplicateDraws.rows) {
      await client.query(`
        DELETE FROM lottery_draws
        WHERE issue_no = $1 AND lottery_type_id = 1
        AND id NOT IN (
          SELECT id FROM lottery_draws
          WHERE issue_no = $1 AND lottery_type_id = 1
          ORDER BY created_at DESC
          LIMIT 1
        )
      `, [duplicate.issue_no]);
      console.log(`✅ 删除期号 ${duplicate.issue_no} 的重复开奖记录`);
    }
    
    // 3. 修复期号日期问题
    console.log('3. 修复期号日期问题...');
    const wrongDateIssues = await client.query(`
      SELECT id, issue_no, issue_date, created_at
      FROM lottery_issues
      WHERE DATE(issue_date) != DATE(created_at)
      AND lottery_type_id = 1
    `);
    
    console.log(`发现 ${wrongDateIssues.rows.length} 个日期错误的期号`);
    
    for (const issue of wrongDateIssues.rows) {
      const correctDate = new Date(issue.created_at).toISOString().split('T')[0];
      await client.query(
        'UPDATE lottery_issues SET issue_date = $1 WHERE id = $2',
        [correctDate, issue.id]
      );
      console.log(`✅ 修复期号 ${issue.issue_no} 日期: ${issue.issue_date} -> ${correctDate}`);
    }
    
    // 4. 最终一致性检查
    console.log('4. 执行最终一致性检查...');
    const finalCheck = await client.query(`
      SELECT 
        COUNT(CASE WHEN i.status = 'pending' THEN 1 END) as pending_issues,
        COUNT(CASE WHEN i.status = 'drawn' THEN 1 END) as drawn_issues,
        COUNT(d.id) as draw_records,
        COUNT(CASE WHEN i.status = 'drawn' AND d.id IS NULL THEN 1 END) as missing_draws,
        COUNT(CASE WHEN i.status = 'pending' AND d.id IS NOT NULL THEN 1 END) as extra_draws
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1
    `);
    
    console.log('\n📊 修复后的数据一致性检查:');
    console.table(finalCheck.rows);
    
    await client.query('COMMIT');
    console.log('\n✅ 数据一致性修复完成！');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 数据一致性修复失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

fixDataConsistency().catch(console.error);
