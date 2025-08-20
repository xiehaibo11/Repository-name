const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'lottery_management',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

async function migrateAdminProfile() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 开始执行管理员个人资料字段迁移...');
    
    // 添加昵称字段
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);
    `);
    console.log('✅ 添加 nickname 字段');
    
    // 添加手机号字段
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);
    `);
    console.log('✅ 添加 phone 字段');
    
    // 添加头像字段
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);
    `);
    console.log('✅ 添加 avatar 字段');
    
    // 添加最后登录时间字段
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;
    `);
    console.log('✅ 添加 last_login_at 字段');
    
    // 添加最后登录IP字段
    await client.query(`
      ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);
    `);
    console.log('✅ 添加 last_login_ip 字段');
    
    // 修改email字段为可空
    try {
      await client.query(`
        ALTER TABLE admins ALTER COLUMN email DROP NOT NULL;
      `);
      console.log('✅ 修改 email 字段为可空');
    } catch (error) {
      console.log('⚠️  email 字段可能已经是可空的');
    }
    
    // 查看表结构
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'admins' 
      ORDER BY ordinal_position;
    `);
    
    console.log('\n📋 当前 admins 表结构:');
    console.table(result.rows);
    
    console.log('\n✅ 管理员个人资料字段迁移完成！');
    
  } catch (error) {
    console.error('❌ 迁移失败:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// 执行迁移
migrateAdminProfile()
  .then(() => {
    console.log('🎉 迁移成功完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 迁移失败:', error);
    process.exit(1);
  });
