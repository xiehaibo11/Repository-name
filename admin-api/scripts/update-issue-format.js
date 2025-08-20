const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_system',
  password: process.env.DB_PASSWORD || 'password',
  port: process.env.DB_PORT || 5432,
});

async function updateIssueFormat() {
  try {
    console.log('🔄 更新期号格式...');
    
    // 更新分分时时彩的期号格式
    const updateQuery = `
      UPDATE lottery_types 
      SET issue_format = 'YYMMDD{HHMM}' 
      WHERE code = 'ssc'
    `;
    
    const result = await pool.query(updateQuery);
    console.log(`✅ 更新了 ${result.rowCount} 个彩种的期号格式`);
    
    // 清理旧的期号数据
    console.log('🗑️ 清理旧期号数据...');
    const deleteQuery = `
      DELETE FROM lottery_issues 
      WHERE lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
    `;
    
    const deleteResult = await pool.query(deleteQuery);
    console.log(`✅ 删除了 ${deleteResult.rowCount} 条旧期号记录`);
    
    console.log('✅ 期号格式更新完成！');
    console.log('💡 请重新生成今日期号以使用新格式');
    
  } catch (error) {
    console.error('❌ 更新失败:', error);
  } finally {
    await pool.end();
  }
}

updateIssueFormat();
