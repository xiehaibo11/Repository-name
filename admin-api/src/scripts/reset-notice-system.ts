import { Pool } from 'pg';
import sequelize from '../config/database';

/**
 * 重置公告系统 - 删除并重新创建公告表
 */
export async function resetNoticeSystem() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'backend_management_clean',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '123456',
  });

  try {
    console.log('🔄 开始重置公告系统...');

    // 1. 删除现有的公告表
    console.log('🗑️ 删除现有公告表...');
    await pool.query('DROP TABLE IF EXISTS notices CASCADE;');
    
    // 2. 删除相关的枚举类型
    console.log('🗑️ 删除枚举类型...');
    await pool.query('DROP TYPE IF EXISTS enum_notices_type CASCADE;');
    await pool.query('DROP TYPE IF EXISTS enum_notices_priority CASCADE;');
    await pool.query('DROP TYPE IF EXISTS enum_notices_status CASCADE;');
    await pool.query('DROP TYPE IF EXISTS enum_notices_target_audience CASCADE;');

    // 3. 创建新的枚举类型
    console.log('📝 创建新的枚举类型...');
    await pool.query(`
      CREATE TYPE enum_notices_type AS ENUM ('platform', 'system', 'activity', 'maintenance');
    `);
    
    await pool.query(`
      CREATE TYPE enum_notices_priority AS ENUM ('low', 'medium', 'high', 'urgent');
    `);
    
    await pool.query(`
      CREATE TYPE enum_notices_status AS ENUM ('draft', 'published', 'archived');
    `);
    
    await pool.query(`
      CREATE TYPE enum_notices_target_audience AS ENUM ('all', 'members', 'agents');
    `);

    // 4. 创建新的公告表
    console.log('📝 创建新的公告表...');
    await pool.query(`
      CREATE TABLE notices (
        id SERIAL PRIMARY KEY,
        title VARCHAR(200) NOT NULL,
        content TEXT NOT NULL,
        type enum_notices_type NOT NULL DEFAULT 'platform',
        priority enum_notices_priority NOT NULL DEFAULT 'medium',
        status enum_notices_status NOT NULL DEFAULT 'draft',
        publish_time TIMESTAMP,
        expire_time TIMESTAMP,
        target_audience enum_notices_target_audience NOT NULL DEFAULT 'all',
        is_top BOOLEAN NOT NULL DEFAULT false,
        view_count INTEGER NOT NULL DEFAULT 0,
        created_by INTEGER NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 5. 创建索引
    console.log('📝 创建索引...');
    await pool.query(`
      CREATE INDEX idx_notices_status_publish_time ON notices(status, publish_time);
    `);
    
    await pool.query(`
      CREATE INDEX idx_notices_type_target_audience ON notices(type, target_audience);
    `);
    
    await pool.query(`
      CREATE INDEX idx_notices_is_top_priority ON notices(is_top, priority);
    `);

    // 6. 创建示例公告
    console.log('📝 创建示例公告...');
    await pool.query(`
      INSERT INTO notices (
        title, 
        content, 
        type, 
        priority, 
        status, 
        target_audience, 
        is_top, 
        created_by,
        publish_time
      ) VALUES 
      (
        '欢迎使用彩票管理系统', 
        '欢迎使用我们的彩票管理系统！系统提供完整的彩票管理功能，包括开奖、投注、结算等。如有任何问题，请联系客服。', 
        'platform', 
        'medium', 
        'published', 
        'all', 
        true, 
        1,
        CURRENT_TIMESTAMP
      ),
      (
        '系统维护通知', 
        '系统将于每日凌晨2:00-3:00进行例行维护，期间可能影响部分功能使用，请合理安排时间。', 
        'maintenance', 
        'high', 
        'published', 
        'all', 
        false, 
        1,
        CURRENT_TIMESTAMP
      );
    `);

    console.log('✅ 公告系统重置完成！');
    
  } catch (error) {
    console.error('❌ 重置公告系统失败:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  resetNoticeSystem()
    .then(() => {
      console.log('🎉 公告系统重置成功！');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 重置失败:', error);
      process.exit(1);
    });
}
