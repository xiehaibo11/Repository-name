import { Pool } from 'pg';
import { EnhancedSuperJackpotService } from '../src/services/enhancedSuperJackpotService';

/**
 * 超级大奖系统演示脚本
 * 展示系统的核心功能和工作流程
 */

// 数据库连接配置
const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'lottery_admin',
  password: process.env.DB_PASSWORD || 'password',
  port: parseInt(process.env.DB_PORT || '5432'),
});

const superJackpotService = new EnhancedSuperJackpotService(pool);

async function demonstrateSuperJackpot() {
  console.log('🎰 超级大奖系统演示');
  console.log('='.repeat(50));
  
  try {
    // 1. 显示系统状态
    console.log('\n📊 1. 系统状态');
    console.log('-'.repeat(30));
    
    const stats = await superJackpotService.getJackpotStats();
    console.log(`当前奖金池: ${stats.currentJackpot.toLocaleString()}`);
    console.log(`历史中奖人数: ${stats.totalWinners}`);
    console.log(`累计支付金额: ${stats.totalPaid.toLocaleString()}`);
    console.log(`目标概率: ${stats.targetProbability} (约${Math.round(1/stats.targetProbability).toLocaleString()}分之一)`);
    console.log(`预估中奖天数: ${stats.estimatedDaysToWin}天`);
    
    // 2. 模拟投注数据
    console.log('\n🎲 2. 模拟投注场景');
    console.log('-'.repeat(30));
    
    const mockBets = [
      {
        id: 1,
        user_id: 1001,
        amount: 100,
        bet_type: 'number_play',
        bet_content: JSON.stringify({ position: 0, number: 5 }),
        status: 'active'
      },
      {
        id: 2,
        user_id: 1002,
        amount: 50,
        bet_type: 'double_side',
        bet_content: JSON.stringify({ position: 1, type: 'big' }),
        status: 'active'
      },
      {
        id: 3,
        user_id: 1003,
        amount: 200,
        bet_type: 'positioning',
        bet_content: JSON.stringify({ positions: [0, 1], numbers: [5, 6] }),
        status: 'active'
      }
    ];
    
    console.log(`模拟投注数量: ${mockBets.length}`);
    console.log(`总投注金额: ${mockBets.reduce((sum, bet) => sum + bet.amount, 0)}`);
    
    // 3. 模拟开奖号码
    const mockDrawNumbers = [5, 6, 3, 8, 2];
    console.log(`模拟开奖号码: ${mockDrawNumbers.join(',')}`);
    
    // 4. 添加奖金池贡献
    console.log('\n💰 3. 奖金池贡献');
    console.log('-'.repeat(30));
    
    for (const bet of mockBets) {
      await superJackpotService.addJackpotContribution(
        bet.user_id,
        20241201001, // 模拟期号ID
        bet.id,
        bet.amount
      );
      console.log(`用户${bet.user_id}投注${bet.amount}元，贡献${(bet.amount * 0.001).toFixed(2)}元到奖金池`);
    }
    
    // 5. 模拟超级大奖检查
    console.log('\n🎯 4. 超级大奖检查');
    console.log('-'.repeat(30));
    
    console.log('正在检查超级大奖触发...');
    
    // 注意：这里使用模拟数据，实际概率极低，几乎不会触发
    const winners = await superJackpotService.processSuperJackpot(
      20241201001, // 期号ID
      '20241201001', // 期号
      mockDrawNumbers,
      mockBets
    );
    
    if (winners.length > 0) {
      console.log('🎉 恭喜！触发超级大奖！');
      for (const winner of winners) {
        console.log(`中奖用户: ${winner.user_id}`);
        console.log(`中奖金额: ${winner.amount.toLocaleString()}`);
        console.log(`投注类型: ${winner.bet_type}`);
        console.log(`使用概率: ${winner.probability_used}`);
      }
    } else {
      console.log('本期未触发超级大奖（这是正常情况，概率极低）');
    }
    
    // 6. 显示最新统计
    console.log('\n📈 5. 更新后统计');
    console.log('-'.repeat(30));
    
    const updatedStats = await superJackpotService.getJackpotStats();
    console.log(`当前奖金池: ${updatedStats.currentJackpot.toLocaleString()}`);
    console.log(`累计贡献: ${updatedStats.totalContributions.toLocaleString()}`);
    
    // 7. 概率计算演示
    console.log('\n🧮 6. 概率计算演示');
    console.log('-'.repeat(30));
    
    const baseProbability = 1 / 59600000;
    console.log(`基础概率: ${baseProbability} (${(baseProbability * 100).toExponential(2)}%)`);
    console.log(`每天1440期，理论上需要 ${Math.round(1 / baseProbability / 1440)} 天才可能中奖一次`);
    console.log(`这相当于约 ${Math.round(1 / baseProbability / 1440 / 365)} 年`);
    
    // 8. 系统配置展示
    console.log('\n⚙️ 7. 系统配置');
    console.log('-'.repeat(30));
    
    const configResult = await pool.query(`
      SELECT * FROM super_jackpot_config WHERE config_name = 'default'
    `);
    
    if (configResult.rows.length > 0) {
      const config = configResult.rows[0];
      console.log(`基础概率: ${config.base_probability}`);
      console.log(`最大概率限制: ${config.max_probability}`);
      console.log(`最小投注金额: ${config.min_bet_amount}`);
      console.log(`每期最大中奖人数: ${config.max_winners_per_issue}`);
      console.log(`系统状态: ${config.is_active ? '激活' : '停用'}`);
    }
    
    // 9. 日志查询演示
    console.log('\n📋 8. 最近日志');
    console.log('-'.repeat(30));
    
    const logsResult = await pool.query(`
      SELECT event_type, is_triggered, total_bets, final_probability, created_at
      FROM super_jackpot_logs
      ORDER BY created_at DESC
      LIMIT 5
    `);
    
    if (logsResult.rows.length > 0) {
      console.log('最近5条日志:');
      for (const log of logsResult.rows) {
        console.log(`${log.created_at.toISOString()} - ${log.event_type} - 触发:${log.is_triggered ? '是' : '否'} - 投注数:${log.total_bets} - 概率:${log.final_probability || 'N/A'}`);
      }
    } else {
      console.log('暂无日志记录');
    }
    
    console.log('\n✅ 演示完成！');
    console.log('\n📝 说明:');
    console.log('• 超级大奖概率极低，正常情况下不会触发');
    console.log('• 每笔投注都会向奖金池贡献0.1%');
    console.log('• 系统会记录所有检查过程和结果');
    console.log('• 管理员可以通过API接口监控系统状态');
    
  } catch (error) {
    console.error('❌ 演示过程中发生错误:', error);
  }
}

// 测试概率计算的辅助函数
async function testProbabilityCalculation() {
  console.log('\n🧪 概率计算测试');
  console.log('='.repeat(50));
  
  const testCases = [
    { bets: 100, description: '少量投注' },
    { bets: 1000, description: '中等投注' },
    { bets: 10000, description: '大量投注' },
    { bets: 100000, description: '极大量投注' }
  ];
  
  for (const testCase of testCases) {
    // 模拟不同投注量的概率计算
    const baseProbability = 1 / 59600000;
    const betVolumeMultiplier = Math.min(1 + (testCase.bets / 10000), 2.0);
    const finalProbability = baseProbability * betVolumeMultiplier;
    
    console.log(`${testCase.description} (${testCase.bets}笔):`);
    console.log(`  基础概率: ${baseProbability.toExponential(2)}`);
    console.log(`  调整倍数: ${betVolumeMultiplier.toFixed(3)}`);
    console.log(`  最终概率: ${finalProbability.toExponential(2)}`);
    console.log(`  理论触发间隔: ${Math.round(1 / finalProbability).toLocaleString()}次`);
    console.log('');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  demonstrateSuperJackpot()
    .then(() => testProbabilityCalculation())
    .then(() => {
      console.log('🎯 演示和测试完成');
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ 演示失败:', error);
      process.exit(1);
    });
}

export { demonstrateSuperJackpot, testProbabilityCalculation };
