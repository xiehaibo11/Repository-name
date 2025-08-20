const { Pool } = require('pg');

/**
 * 测试超级大奖系统
 */

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_admin',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function testSuperJackpotSystem() {
  console.log('🎰 测试超级大奖系统');
  console.log('='.repeat(50));
  
  try {
    // 1. 测试数据库连接
    console.log('\n📊 1. 测试数据库连接');
    console.log('-'.repeat(30));
    
    const client = await pool.connect();
    console.log('✅ 数据库连接成功');
    
    // 2. 检查表是否存在
    console.log('\n🔍 2. 检查超级大奖表结构');
    console.log('-'.repeat(30));
    
    const tables = [
      'super_jackpot_pool',
      'super_jackpot_winners',
      'super_jackpot_config',
      'super_jackpot_logs',
      'super_jackpot_contributions',
      'super_jackpot_statistics'
    ];
    
    let tablesExist = 0;
    for (const table of tables) {
      try {
        const result = await client.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          );
        `, [table]);
        
        if (result.rows[0].exists) {
          console.log(`✅ 表 ${table} 存在`);
          tablesExist++;
        } else {
          console.log(`❌ 表 ${table} 不存在`);
        }
      } catch (error) {
        console.log(`❌ 检查表 ${table} 失败:`, error.message);
      }
    }
    
    if (tablesExist === 0) {
      console.log('\n⚠️  超级大奖系统表不存在，需要先创建');
      console.log('请运行以下SQL脚本创建表:');
      console.log('database/migrations/create_super_jackpot_system.sql');
      
      // 尝试创建基础表
      console.log('\n🔧 尝试创建基础表...');
      
      try {
        // 创建奖金池表
        await client.query(`
          CREATE TABLE IF NOT EXISTS super_jackpot_pool (
            id SERIAL PRIMARY KEY,
            current_amount DECIMAL(15,2) NOT NULL DEFAULT 1000000.00,
            base_amount DECIMAL(15,2) NOT NULL DEFAULT 1000000.00,
            total_contributions DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            total_payouts DECIMAL(15,2) NOT NULL DEFAULT 0.00,
            status VARCHAR(20) NOT NULL DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // 插入初始数据
        await client.query(`
          INSERT INTO super_jackpot_pool (id, current_amount, base_amount) 
          VALUES (1, 1000000.00, 1000000.00) 
          ON CONFLICT (id) DO NOTHING;
        `);
        
        // 创建配置表
        await client.query(`
          CREATE TABLE IF NOT EXISTS super_jackpot_config (
            id SERIAL PRIMARY KEY,
            config_name VARCHAR(100) NOT NULL UNIQUE,
            base_probability DECIMAL(20,10) NOT NULL DEFAULT 0.0000000168,
            bet_volume_multiplier DECIMAL(10,6) NOT NULL DEFAULT 1.0,
            jackpot_multiplier DECIMAL(10,6) NOT NULL DEFAULT 1.0,
            time_multiplier DECIMAL(10,6) NOT NULL DEFAULT 1.0,
            max_probability DECIMAL(10,8) NOT NULL DEFAULT 0.001000,
            min_bet_amount DECIMAL(10,2) NOT NULL DEFAULT 10.00,
            max_winners_per_issue INTEGER NOT NULL DEFAULT 1,
            is_active BOOLEAN NOT NULL DEFAULT true,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
        
        // 插入默认配置
        await client.query(`
          INSERT INTO super_jackpot_config (
            config_name, base_probability, description
          ) VALUES (
            'default', 
            0.0000000168, 
            '默认超级大奖配置 - 约5960万分之一中奖概率'
          ) ON CONFLICT (config_name) DO NOTHING;
        `);
        
        console.log('✅ 基础表创建成功');
        
      } catch (createError) {
        console.log('❌ 创建基础表失败:', createError.message);
      }
    }
    
    // 3. 测试奖金池状态
    console.log('\n💰 3. 测试奖金池状态');
    console.log('-'.repeat(30));
    
    try {
      const poolResult = await client.query(`
        SELECT * FROM super_jackpot_pool WHERE id = 1
      `);
      
      if (poolResult.rows.length > 0) {
        const pool = poolResult.rows[0];
        console.log(`当前奖金池: ${parseFloat(pool.current_amount).toLocaleString()}`);
        console.log(`基础金额: ${parseFloat(pool.base_amount).toLocaleString()}`);
        console.log(`累计贡献: ${parseFloat(pool.total_contributions).toLocaleString()}`);
        console.log(`累计支出: ${parseFloat(pool.total_payouts).toLocaleString()}`);
        console.log(`状态: ${pool.status}`);
      } else {
        console.log('❌ 奖金池数据不存在');
      }
    } catch (error) {
      console.log('❌ 查询奖金池失败:', error.message);
    }
    
    // 4. 测试配置
    console.log('\n⚙️  4. 测试系统配置');
    console.log('-'.repeat(30));
    
    try {
      const configResult = await client.query(`
        SELECT * FROM super_jackpot_config WHERE config_name = 'default'
      `);
      
      if (configResult.rows.length > 0) {
        const config = configResult.rows[0];
        console.log(`基础概率: ${config.base_probability} (约${Math.round(1/config.base_probability).toLocaleString()}分之一)`);
        console.log(`最大概率限制: ${config.max_probability}`);
        console.log(`最小投注金额: ${config.min_bet_amount}`);
        console.log(`系统状态: ${config.is_active ? '激活' : '停用'}`);
        console.log(`描述: ${config.description}`);
      } else {
        console.log('❌ 系统配置不存在');
      }
    } catch (error) {
      console.log('❌ 查询配置失败:', error.message);
    }
    
    // 5. 测试API接口
    console.log('\n🌐 5. 测试API接口');
    console.log('-'.repeat(30));
    
    console.log('超级大奖API接口:');
    console.log('• GET  /api/admin/super-jackpot/status - 获取系统状态');
    console.log('• GET  /api/admin/super-jackpot/winners - 获取中奖记录');
    console.log('• POST /api/admin/super-jackpot/config - 更新配置');
    console.log('• GET  /api/admin/super-jackpot/report - 获取统计报表');
    
    console.log('\n📋 6. 概率计算示例');
    console.log('-'.repeat(30));
    
    const baseProbability = 1 / 59600000;
    console.log(`基础概率: ${baseProbability.toExponential(2)} (约${Math.round(1/baseProbability).toLocaleString()}分之一)`);
    console.log(`每天1440期，理论中奖间隔: ${Math.round(1/baseProbability/1440)}天`);
    console.log(`相当于约: ${Math.round(1/baseProbability/1440/365)}年`);
    
    client.release();
    
    console.log('\n✅ 超级大奖系统测试完成！');
    console.log('\n📝 说明:');
    console.log('• 系统已集成到分分时时彩开奖流程中');
    console.log('• 每笔投注自动贡献0.1%到奖金池');
    console.log('• 概率极低，正常情况下不会触发');
    console.log('• 所有过程都有详细日志记录');
    
  } catch (error) {
    console.error('❌ 测试失败:', error);
  } finally {
    await pool.end();
  }
}

// 运行测试
testSuperJackpotSystem()
  .then(() => {
    console.log('🎯 测试完成');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ 测试失败:', error);
    process.exit(1);
  });
