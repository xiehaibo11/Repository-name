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

async function checkMembers() {
  const client = await pool.connect();
  
  try {
    console.log('🔍 检查现有会员账户...\n');
    
    // 查询所有会员
    const result = await client.query(`
      SELECT id, username, nickname, balance, status, 
             last_login_at, last_login_ip, last_login_location,
             created_at
      FROM members 
      ORDER BY created_at DESC;
    `);
    
    if (result.rows.length > 0) {
      console.log(`📊 找到 ${result.rows.length} 个会员账户:\n`);
      
      result.rows.forEach((member, index) => {
        console.log(`${index + 1}. 会员信息:`);
        console.log(`   - ID: ${member.id}`);
        console.log(`   - 用户名: ${member.username}`);
        console.log(`   - 昵称: ${member.nickname}`);
        console.log(`   - 余额: ${member.balance}`);
        console.log(`   - 状态: ${member.status}`);
        console.log(`   - 最后登录时间: ${member.last_login_at || '未登录'}`);
        console.log(`   - 最后登录IP: ${member.last_login_ip || '无'}`);
        console.log(`   - 最后登录地址: ${member.last_login_location || '无'}`);
        console.log(`   - 创建时间: ${member.created_at}`);
        console.log('   ---');
      });
      
      // 推荐测试账户
      const testAccount = result.rows[0];
      console.log(`\n💡 建议使用以下账户进行测试:`);
      console.log(`   用户名: ${testAccount.username}`);
      console.log(`   密码: 需要查看创建时使用的密码`);
      
    } else {
      console.log('❌ 没有找到任何会员账户');
      console.log('💡 请先创建会员账户或运行数据库初始化脚本');
    }
    
  } catch (error) {
    console.error('❌ 检查会员失败:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

// 运行检查
checkMembers().catch(error => {
  console.error('💥 检查脚本执行失败:', error);
  process.exit(1);
});
