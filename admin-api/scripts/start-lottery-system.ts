#!/usr/bin/env ts-node

import { pool } from '../src/db';
import { SSCLotteryService } from '../src/services/sscLotteryService';
import { LotteryService } from '../src/services/lotteryService';

async function startLotterySystem() {
  console.log('🎲 正在启动彩票管理系统...\n');

  try {
    // 1. 检查数据库连接
    console.log('📡 检查数据库连接...');
    await pool.query('SELECT 1');
    console.log('✅ 数据库连接正常\n');

    // 2. 检查彩票系统表是否存在
    console.log('🔍 检查彩票系统表结构...');
    const tableCheck = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name IN ('lottery_types', 'lottery_issues', 'lottery_draws', 'lottery_scheduler')
    `);

    if (tableCheck.rows.length < 4) {
      console.log('❌ 彩票系统表不完整，请先执行数据库初始化脚本');
      console.log('   运行命令: psql -d your_database -f scripts/init-lottery-system.sql');
      process.exit(1);
    }
    console.log('✅ 彩票系统表结构完整\n');

    // 3. 初始化彩票服务
    console.log('⚙️ 初始化彩票服务...');
    const lotteryService = new LotteryService(pool);
    await lotteryService.createCleanupFunction();
    console.log('✅ 彩票服务初始化完成\n');

    // 4. 初始化分分时时彩服务
    console.log('🎯 初始化分分时时彩服务...');
    const sscService = SSCLotteryService.getInstance(pool);
    
    // 检查分分时时彩彩种是否存在
    const sscCheck = await pool.query(
      'SELECT id FROM lottery_types WHERE code = $1',
      ['ssc']
    );

    if (sscCheck.rows.length === 0) {
      console.log('📝 创建分分时时彩彩种...');
      await lotteryService.createLotteryType({
        name: '分分时时彩',
        code: 'ssc',
        category: 'ssc',
        draw_frequency: 'minutes',
        draw_interval: 1,
        daily_start_issue: 1,
        issue_format: 'YYYYMMDD{####}',
        number_count: 5,
        number_range_min: 0,
        number_range_max: 9,
        start_time: '00:00:00',
        end_time: '23:59:59',
        description: '分分时时彩，每分钟开奖一次，全天24小时不间断',
        status: 'active'
      });
      console.log('✅ 分分时时彩彩种创建成功');
    } else {
      console.log('✅ 分分时时彩彩种已存在');
    }

    // 5. 启动分分时时彩系统
    console.log('\n🚀 启动分分时时彩系统...');
    await sscService.startSSCSystem();
    console.log('✅ 分分时时彩系统启动成功\n');

    // 6. 显示系统状态
    console.log('📊 系统状态信息:');
    const status = await sscService.getSystemStatus();
    console.log(`   - 系统运行状态: ${status.is_running ? '✅ 运行中' : '❌ 已停止'}`);
    console.log(`   - 今日总期数: ${status.today_stats.total_issues}`);
    console.log(`   - 待开奖期数: ${status.today_stats.pending_issues}`);
    console.log(`   - 已开奖期数: ${status.today_stats.completed_draws}`);
    
    if (status.current_issue) {
      console.log(`   - 当前期号: ${status.current_issue.issue_no}`);
      const drawTime = new Date(status.current_issue.draw_time);
      console.log(`   - 下次开奖: ${drawTime.toLocaleString('zh-CN')}`);
    }

    if (status.latest_draw) {
      console.log(`   - 最新开奖: ${status.latest_draw.issue_no} - ${status.latest_draw.draw_numbers}`);
    }

    console.log('\n🎉 彩票管理系统启动完成！');
    console.log('\n📋 可用的API接口:');
    console.log('   管理端:');
    console.log('   - POST /api/admin/lottery/init - 初始化系统');
    console.log('   - GET  /api/admin/ssc/status - 获取系统状态');
    console.log('   - POST /api/admin/ssc/manual-draw - 手动开奖');
    console.log('   - GET  /api/admin/lottery/draw/history - 开奖历史');
    console.log('\n   用户端:');
    console.log('   - GET  /api/lottery/types - 彩种列表');
    console.log('   - GET  /api/lottery/ssc/game-data - 分分时时彩游戏数据');
    console.log('   - GET  /api/lottery/ssc/current-issue - 当前期号');
    console.log('   - GET  /api/lottery/ssc/latest - 最新开奖结果');
    console.log('   - GET  /api/lottery/ssc/history - 开奖历史');
    console.log('   - GET  /api/lottery/ssc/analysis - 投注分析');

    console.log('\n💡 提示:');
    console.log('   - 系统将每分钟自动开奖');
    console.log('   - 每日凌晨自动生成新期号');
    console.log('   - 每日凌晨自动清理历史数据');
    console.log('   - 可通过管理接口手动控制系统');

  } catch (error) {
    console.error('❌ 启动彩票系统失败:', error);
    process.exit(1);
  }
}

// 优雅关闭处理
process.on('SIGINT', async () => {
  console.log('\n🛑 正在关闭彩票系统...');
  try {
    await pool.end();
    console.log('✅ 彩票系统已安全关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 关闭系统时出错:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 收到终止信号，正在关闭彩票系统...');
  try {
    await pool.end();
    console.log('✅ 彩票系统已安全关闭');
    process.exit(0);
  } catch (error) {
    console.error('❌ 关闭系统时出错:', error);
    process.exit(1);
  }
});

// 启动系统
if (require.main === module) {
  startLotterySystem();
}
