const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'backend_management_clean',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
});

async function checkAdminDB() {
  try {
    console.log('🔍 检查管理员数据库结构...');
    console.log('数据库配置:', {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || '5432',
      database: process.env.DB_NAME || 'backend_management_clean',
      user: process.env.DB_USER || 'postgres'
    });

    // 检查所有表
    const tablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `);

    console.log('\n📊 管理员数据库中的所有表:');
    tablesResult.rows.forEach(row => {
      console.log(`  📋 ${row.table_name}`);
    });

    // 检查是否有SSC相关表
    const sscTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'ssc_%'
      ORDER BY table_name
    `);

    console.log('\n🎲 SSC相关表:');
    if (sscTablesResult.rows.length === 0) {
      console.log('  ❌ 没有找到任何SSC相关表');
    } else {
      sscTablesResult.rows.forEach(row => {
        console.log(`  ✅ ${row.table_name}`);
      });
    }

    // 检查彩票相关表
    const lotteryTablesResult = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND (table_name LIKE 'lottery_%' OR table_name LIKE '%lottery%')
      ORDER BY table_name
    `);

    console.log('\n🎰 彩票相关表:');
    if (lotteryTablesResult.rows.length === 0) {
      console.log('  ❌ 没有找到任何彩票相关表');
    } else {
      lotteryTablesResult.rows.forEach(row => {
        console.log(`  🎰 ${row.table_name}`);
      });
    }

  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await pool.end();
  }
}

checkAdminDB();
