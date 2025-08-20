const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

async function cleanInvalidIssues() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🧹 开始清理无效的历史期号...');
    
    // 1. 查找所有错误的期号（issue_date 与实际时间不符）
    console.log('1. 检查日期错误的期号...');
    const invalidDateIssues = await client.query(`
      SELECT id, issue_no, issue_date, created_at,
             DATE(created_at) as actual_date,
             CASE 
               WHEN DATE(issue_date) != DATE(created_at) THEN 'date_mismatch'
               ELSE 'ok'
             END as issue_type
      FROM lottery_issues
      WHERE lottery_type_id = 1
        AND DATE(issue_date) != DATE(created_at)
      ORDER BY created_at DESC
    `);
    
    console.log(`发现 ${invalidDateIssues.rows.length} 个日期错误的期号`);
    
    // 2. 查找过期的未开奖期号（超过2小时未开奖的）
    console.log('2. 检查过期未开奖的期号...');
    const expiredIssues = await client.query(`
      SELECT i.id, i.issue_no, i.draw_time, i.status
      FROM lottery_issues i
      LEFT JOIN lottery_draws d ON i.id = d.issue_id
      WHERE i.lottery_type_id = 1
        AND i.status = 'pending'
        AND i.draw_time < NOW() - INTERVAL '2 hours'
        AND d.id IS NULL
      ORDER BY i.draw_time DESC
    `);
    
    console.log(`发现 ${expiredIssues.rows.length} 个过期未开奖的期号`);
    
    // 3. 查找重复的期号
    console.log('3. 检查重复期号...');
    const duplicateIssues = await client.query(`
      SELECT issue_no, COUNT(*) as count, array_agg(id) as ids
      FROM lottery_issues
      WHERE lottery_type_id = 1
      GROUP BY issue_no
      HAVING COUNT(*) > 1
    `);
    
    console.log(`发现 ${duplicateIssues.rows.length} 组重复期号`);
    
    // 4. 显示清理计划
    const totalToClean = invalidDateIssues.rows.length + expiredIssues.rows.length;
    let duplicateCount = 0;
    duplicateIssues.rows.forEach(row => {
      duplicateCount += row.count - 1; // 每组保留1个，删除其余的
    });
    
    console.log('\n📋 清理计划:');
    console.log(`   - 日期错误期号: ${invalidDateIssues.rows.length} 个`);
    console.log(`   - 过期未开奖期号: ${expiredIssues.rows.length} 个`);
    console.log(`   - 重复期号: ${duplicateCount} 个`);
    console.log(`   - 总计清理: ${totalToClean + duplicateCount} 个期号`);
    
    // 5. 执行清理（需要用户确认）
    console.log('\n⚠️  即将开始清理，这将删除无效的期号记录...');
    
    // 清理日期错误的期号
    if (invalidDateIssues.rows.length > 0) {
      console.log('🗑️  清理日期错误的期号...');
      const invalidIds = invalidDateIssues.rows.map(row => row.id);
      
      // 先删除相关的开奖记录
      await client.query(`
        DELETE FROM lottery_draws 
        WHERE issue_id = ANY($1)
      `, [invalidIds]);
      
      // 再删除期号记录
      const deleteResult = await client.query(`
        DELETE FROM lottery_issues 
        WHERE id = ANY($1)
      `, [invalidIds]);
      
      console.log(`✅ 已删除 ${deleteResult.rowCount} 个日期错误的期号`);
    }
    
    // 清理过期未开奖的期号
    if (expiredIssues.rows.length > 0) {
      console.log('🗑️  清理过期未开奖的期号...');
      const expiredIds = expiredIssues.rows.map(row => row.id);
      
      const deleteResult = await client.query(`
        DELETE FROM lottery_issues 
        WHERE id = ANY($1)
      `, [expiredIds]);
      
      console.log(`✅ 已删除 ${deleteResult.rowCount} 个过期未开奖的期号`);
    }
    
    // 清理重复期号（保留最新的）
    if (duplicateIssues.rows.length > 0) {
      console.log('🗑️  清理重复期号...');
      let deletedCount = 0;
      
      for (const duplicate of duplicateIssues.rows) {
        const ids = duplicate.ids;
        // 保留最新的（ID最大的），删除其他的
        const maxId = Math.max(...ids);
        const toDelete = ids.filter(id => id !== maxId);
        
        if (toDelete.length > 0) {
          // 先删除相关的开奖记录
          await client.query(`
            DELETE FROM lottery_draws 
            WHERE issue_id = ANY($1)
          `, [toDelete]);
          
          // 再删除期号记录
          const deleteResult = await client.query(`
            DELETE FROM lottery_issues 
            WHERE id = ANY($1)
          `, [toDelete]);
          
          deletedCount += deleteResult.rowCount;
          console.log(`   删除期号 ${duplicate.issue_no} 的 ${deleteResult.rowCount} 个重复记录`);
        }
      }
      
      console.log(`✅ 已删除 ${deletedCount} 个重复期号`);
    }
    
    // 6. 最终检查
    console.log('6. 执行最终数据检查...');
    const finalCheck = await client.query(`
      SELECT 
        COUNT(*) as total_issues,
        COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_issues,
        COUNT(CASE WHEN status = 'drawn' THEN 1 END) as drawn_issues,
        COUNT(CASE WHEN DATE(issue_date) != DATE(created_at) THEN 1 END) as date_errors
      FROM lottery_issues
      WHERE lottery_type_id = 1
    `);
    
    console.log('\n📊 清理后的数据统计:');
    console.table(finalCheck.rows);
    
    await client.query('COMMIT');
    console.log('\n✅ 数据清理完成！');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ 数据清理失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

cleanInvalidIssues().catch(console.error);
