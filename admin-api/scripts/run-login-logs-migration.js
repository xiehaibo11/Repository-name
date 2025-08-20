const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'member_system',
});

async function runLoginLogsMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始执行登录日志表迁移...');
    
    // 读取迁移文件
    const migrationFile = path.join(__dirname, '../migrations/create-login-logs-table.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ 迁移文件不存在:', migrationFile);
      return;
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log('📄 读取迁移文件:', migrationFile);
    
    // 执行SQL
    await client.query(sql);
    console.log('✅ 登录日志表迁移执行成功！');
    
    // 验证表是否创建成功
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'login_logs' 
      ORDER BY ordinal_position;
    `);
    
    console.log('🔍 验证登录日志表结构:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    if (result.rows.length > 0) {
      console.log('🎉 登录日志表创建成功！');
    } else {
      console.log('⚠️  登录日志表可能创建失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    
    // 如果是表已存在的错误，这是正常的
    if (error.message.includes('already exists')) {
      console.log('ℹ️  登录日志表已存在，跳过迁移');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行迁移
runLoginLogsMigration().catch(error => {
  console.error('💥 迁移脚本执行失败:', error);
  process.exit(1);
});
