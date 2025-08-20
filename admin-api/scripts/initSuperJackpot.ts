import { Pool } from 'pg';
import fs from 'fs';
import path from 'path';

/**
 * 避开中奖控制系统初始化脚本
 * 执行数据库表创建和基础数据初始化
 */

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_admin',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function initializeAvoidWinSystem() {
  const client = await pool.connect();

  try {
    console.log('🚀 开始初始化避开中奖控制系统...');

    // 1. 读取并执行SQL脚本
    const sqlPath = path.join(__dirname, '../database/migrations/create_super_jackpot_system.sql');
    
    if (!fs.existsSync(sqlPath)) {
      throw new Error(`SQL脚本文件不存在: ${sqlPath}`);
    }
    
    const sqlScript = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 执行数据库脚本...');
    await client.query(sqlScript);
    
    // 2. 验证表是否创建成功
    console.log('🔍 验证表结构...');
    const tables = [
      'avoid_win_config',
      'avoid_win_logs',
      'member_bet_analysis',
      'member_win_records',
      'avoid_win_statistics'
    ];
    
    for (const table of tables) {
      const result = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      if (result.rows[0].exists) {
        console.log(`✅ 表 ${table} 创建成功`);
      } else {
        throw new Error(`❌ 表 ${table} 创建失败`);
      }
    }
    
    // 3. 初始化基础配置
    console.log('⚙️ 初始化基础配置...');
    
    // 检查是否已有配置
    const configCheck = await client.query(`
      SELECT COUNT(*) as count FROM avoid_win_config WHERE config_name = 'default'
    `);

    if (parseInt(configCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO avoid_win_config (
          config_name,
          allow_win_probability,
          system_enabled,
          min_bet_amount,
          max_analysis_combinations,
          analysis_timeout_seconds,
          description
        ) VALUES (
          'default',
          0.0000000168,
          true,
          1.00,
          100000,
          30,
          '默认避开中奖配置 - 约5960万分之一允许会员中奖概率'
        )
      `);
      console.log('✅ 默认配置初始化完成');
    } else {
      console.log('ℹ️ 默认配置已存在，跳过初始化');
    }
    
    // 4. 初始化统计表
    console.log('📊 初始化统计表...');

    const statsCheck = await client.query(`
      SELECT COUNT(*) as count FROM avoid_win_statistics WHERE stat_date = CURRENT_DATE
    `);

    if (parseInt(statsCheck.rows[0].count) === 0) {
      await client.query(`
        INSERT INTO avoid_win_statistics (
          stat_date,
          total_issues,
          total_bets,
          total_bet_amount,
          avoided_issues,
          allowed_issues,
          member_wins,
          total_member_winnings,
          system_profit,
          avoid_success_rate
        ) VALUES (
          CURRENT_DATE, 0, 0, 0.00, 0, 0, 0, 0.00, 0.00, 100.0000
        )
      `);
      console.log('✅ 今日统计记录初始化完成');
    } else {
      console.log('ℹ️ 今日统计记录已存在，跳过初始化');
    }
    
    // 5. 创建索引（如果不存在）
    console.log('📊 创建数据库索引...');
    
    const indexes = [
      {
        name: 'idx_avoid_win_logs_issue_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_avoid_win_logs_issue_id ON avoid_win_logs(issue_id);'
      },
      {
        name: 'idx_avoid_win_logs_decision_type',
        sql: 'CREATE INDEX IF NOT EXISTS idx_avoid_win_logs_decision_type ON avoid_win_logs(decision_type);'
      },
      {
        name: 'idx_member_win_records_user_id',
        sql: 'CREATE INDEX IF NOT EXISTS idx_member_win_records_user_id ON member_win_records(user_id);'
      },
      {
        name: 'idx_avoid_win_statistics_stat_date',
        sql: 'CREATE INDEX IF NOT EXISTS idx_avoid_win_statistics_stat_date ON avoid_win_statistics(stat_date);'
      }
    ];
    
    for (const index of indexes) {
      await client.query(index.sql);
      console.log(`✅ 索引 ${index.name} 创建完成`);
    }
    
    // 6. 验证系统状态
    console.log('🔍 验证系统状态...');

    const statusResult = await client.query(`
      SELECT
        c.allow_win_probability,
        c.system_enabled,
        c.min_bet_amount,
        c.description
      FROM avoid_win_config c
      WHERE c.config_name = 'default'
    `);

    if (statusResult.rows.length > 0) {
      const status = statusResult.rows[0];
      console.log('📊 系统状态验证:');
      console.log(`   允许中奖概率: ${status.allow_win_probability} (约${Math.round(1/status.allow_win_probability).toLocaleString()}分之一)`);
      console.log(`   系统状态: ${status.system_enabled ? '已启用' : '已停用'}`);
      console.log(`   最小投注金额: ${status.min_bet_amount}`);
      console.log(`   系统描述: ${status.description}`);
    }
    
    console.log('🎉 避开中奖控制系统初始化完成！');
    console.log('');
    console.log('📋 系统信息:');
    console.log('   • 允许中奖概率: 约5960万分之一');
    console.log('   • 系统功能: 主动避开会员投注号码');
    console.log('   • 总组合数: 100,000 (00000-99999)');
    console.log('   • 系统状态: 已启用');
    console.log('');
    console.log('🔧 管理接口:');
    console.log('   • GET  /api/admin/avoid-win/status - 获取系统状态');
    console.log('   • GET  /api/admin/avoid-win/logs - 获取决策日志');
    console.log('   • GET  /api/admin/avoid-win/analysis - 获取投注分析');
    console.log('   • POST /api/admin/avoid-win/config - 更新配置');
    console.log('   • GET  /api/admin/avoid-win/report - 获取统计报表');
    
  } catch (error) {
    console.error('❌ 避开中奖控制系统初始化失败:', error);
    throw error;
  } finally {
    client.release();
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  initializeAvoidWinSystem()
    .then(() => {
      console.log('✅ 初始化完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 初始化失败:', error);
      process.exit(1);
    });
}

export { initializeAvoidWinSystem };
