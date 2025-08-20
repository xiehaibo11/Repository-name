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

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始执行数据库迁移...');
    
    // 读取迁移文件
    const migrationFile = path.join(__dirname, '../migrations/add-member-login-fields.sql');
    
    if (!fs.existsSync(migrationFile)) {
      console.error('❌ 迁移文件不存在:', migrationFile);
      return;
    }
    
    const sql = fs.readFileSync(migrationFile, 'utf8');
    console.log('📄 读取迁移文件:', migrationFile);
    
    // 执行SQL
    await client.query(sql);
    console.log('✅ 迁移执行成功！');
    
    // 验证字段是否添加成功
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'members' 
        AND column_name IN ('last_login_at', 'last_login_ip', 'last_login_location')
      ORDER BY column_name;
    `);
    
    console.log('🔍 验证新字段:');
    result.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    if (result.rows.length === 3) {
      console.log('🎉 所有字段添加成功！');
    } else {
      console.log('⚠️  部分字段可能已存在或添加失败');
    }
    
  } catch (error) {
    console.error('❌ 迁移执行失败:', error.message);
    
    // 如果是字段已存在的错误，这是正常的
    if (error.message.includes('already exists')) {
      console.log('ℹ️  字段已存在，跳过迁移');
    } else {
      throw error;
    }
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行迁移
runMigration().catch(error => {
  console.error('💥 迁移脚本执行失败:', error);
  process.exit(1);
});
