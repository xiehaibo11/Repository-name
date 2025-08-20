const { Pool } = require('pg');

// 数据库连接配置
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'backend_management_clean',
  password: '123456',
  port: 5432,
});

async function findDuplicateStartTimes() {
  try {
    console.log('🔍 查找重复开始时间的期号...');
    
    // 查找重复的开始时间
    const duplicateQuery = `
      SELECT 
        start_time,
        COUNT(*) as count,
        ARRAY_AGG(id ORDER BY id) as issue_ids,
        ARRAY_AGG(issue_no ORDER BY id) as issue_nos
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      GROUP BY start_time 
      HAVING COUNT(*) > 1
      ORDER BY start_time;
    `;
    
    const result = await pool.query(duplicateQuery);
    
    if (result.rows.length === 0) {
      console.log('✅ 没有发现重复的开始时间');
      return [];
    }
    
    console.log(`⚠️  发现 ${result.rows.length} 个重复的开始时间:`);
    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. 开始时间: ${row.start_time}`);
      console.log(`   期号数量: ${row.count}`);
      console.log(`   期号列表: ${row.issue_nos.join(', ')}`);
      console.log(`   ID列表: ${row.issue_ids.join(', ')}`);
      console.log('');
    });
    
    return result.rows;
  } catch (error) {
    console.error('查找重复期号失败:', error);
    throw error;
  }
}

async function cleanupDuplicates(duplicates) {
  try {
    console.log('🧹 开始清理重复期号...');
    
    let totalDeleted = 0;
    
    for (const duplicate of duplicates) {
      const { start_time, issue_ids, issue_nos } = duplicate;
      
      // 保留第一个期号（ID最小的），删除其他的
      const keepId = issue_ids[0];
      const deleteIds = issue_ids.slice(1);
      
      console.log(`处理开始时间: ${start_time}`);
      console.log(`  保留期号: ${issue_nos[0]} (ID: ${keepId})`);
      console.log(`  删除期号: ${issue_nos.slice(1).join(', ')} (IDs: ${deleteIds.join(', ')})`);
      
      // 删除重复的期号
      for (const deleteId of deleteIds) {
        const deleteQuery = 'DELETE FROM lottery_issues WHERE id = $1';
        const deleteResult = await pool.query(deleteQuery, [deleteId]);
        
        if (deleteResult.rowCount > 0) {
          totalDeleted++;
          console.log(`  ✅ 删除期号 ID: ${deleteId}`);
        } else {
          console.log(`  ❌ 删除期号 ID: ${deleteId} 失败`);
        }
      }
      
      console.log('');
    }
    
    console.log(`🎉 清理完成，共删除 ${totalDeleted} 个重复期号`);
    return totalDeleted;
  } catch (error) {
    console.error('清理重复期号失败:', error);
    throw error;
  }
}

async function verifyCleanup() {
  try {
    console.log('🔍 验证清理结果...');
    
    // 再次检查是否还有重复
    const duplicates = await findDuplicateStartTimes();
    
    if (duplicates.length === 0) {
      console.log('✅ 验证通过，没有重复的开始时间');
    } else {
      console.log('⚠️  仍然存在重复的开始时间，需要进一步处理');
    }
    
    // 统计当前期号数量
    const countQuery = `
      SELECT COUNT(*) as total_count
      FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
    `;
    
    const countResult = await pool.query(countQuery);
    console.log(`📊 当前分分时时彩期号总数: ${countResult.rows[0].total_count}`);
    
  } catch (error) {
    console.error('验证清理结果失败:', error);
    throw error;
  }
}

async function main() {
  try {
    console.log('🚀 开始清理重复期号任务...');
    console.log('');
    
    // 1. 查找重复的开始时间
    const duplicates = await findDuplicateStartTimes();
    
    if (duplicates.length === 0) {
      console.log('✅ 任务完成，没有需要清理的重复期号');
      return;
    }
    
    // 2. 清理重复期号
    await cleanupDuplicates(duplicates);
    
    // 3. 验证清理结果
    await verifyCleanup();
    
    console.log('');
    console.log('🎉 重复期号清理任务完成！');
    
  } catch (error) {
    console.error('❌ 清理任务失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行清理任务
if (require.main === module) {
  main();
}

module.exports = {
  findDuplicateStartTimes,
  cleanupDuplicates,
  verifyCleanup
};
