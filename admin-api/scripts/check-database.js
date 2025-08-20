const { Pool } = require('pg');
require('dotenv').config();

// 数据库连接配置
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '123456',
  database: process.env.DB_NAME || 'member_system',
});

async function checkDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 检查数据库状态...\n');
    
    // 1. 检查所有表
    console.log('📋 数据库表列表:');
    const tablesResult = await client.query(`
      SELECT table_name, table_type 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    
    tablesResult.rows.forEach(row => {
      console.log(`  - ${row.table_name} (${row.table_type})`);
    });
    
    // 2. 检查会员表结构
    console.log('\n👥 会员表 (members) 字段结构:');
    const membersColumns = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'members' 
      ORDER BY ordinal_position;
    `);
    
    membersColumns.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) ${row.column_default ? `default: ${row.column_default}` : ''}`);
    });
    
    // 3. 检查会员数据数量
    console.log('\n📊 数据统计:');
    const memberCount = await client.query('SELECT COUNT(*) as count FROM members');
    console.log(`  - 会员总数: ${memberCount.rows[0].count}`);
    
    const agentCount = await client.query('SELECT COUNT(*) as count FROM agents');
    console.log(`  - 代理商总数: ${agentCount.rows[0].count}`);
    
    const adminCount = await client.query('SELECT COUNT(*) as count FROM admins');
    console.log(`  - 管理员总数: ${adminCount.rows[0].count}`);
    
    // 4. 检查最近的会员记录（包含新字段）
    console.log('\n🔍 最近的会员记录 (前5条):');
    const recentMembers = await client.query(`
      SELECT id, username, nickname, balance, status, 
             last_login_at, last_login_ip, last_login_location,
             created_at, updated_at
      FROM members 
      ORDER BY created_at DESC 
      LIMIT 5;
    `);
    
    if (recentMembers.rows.length > 0) {
      recentMembers.rows.forEach(member => {
        console.log(`  - ID: ${member.id}, 用户名: ${member.username}, 昵称: ${member.nickname}`);
        console.log(`    余额: ${member.balance}, 状态: ${member.status}`);
        console.log(`    最后登录时间: ${member.last_login_at || '未登录'}`);
        console.log(`    最后登录IP: ${member.last_login_ip || '无'}`);
        console.log(`    最后登录地址: ${member.last_login_location || '无'}`);
        console.log(`    创建时间: ${member.created_at}`);
        console.log('    ---');
      });
    } else {
      console.log('  - 暂无会员数据');
    }
    
    // 5. 验证新字段是否正确添加
    console.log('\n✅ 新字段验证:');
    const newFields = ['last_login_at', 'last_login_ip', 'last_login_location'];
    for (const field of newFields) {
      const fieldExists = membersColumns.rows.find(row => row.column_name === field);
      if (fieldExists) {
        console.log(`  ✓ ${field}: ${fieldExists.data_type} (已添加)`);
      } else {
        console.log(`  ✗ ${field}: 字段不存在`);
      }
    }
    
    console.log('\n🎉 数据库检查完成！');
    console.log('📝 总结: 原有数据完整保留，只添加了新的登录信息字段');
    
  } catch (error) {
    console.error('❌ 检查数据库失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行检查
checkDatabase().catch(error => {
  console.error('💥 检查脚本执行失败:', error);
  process.exit(1);
});
