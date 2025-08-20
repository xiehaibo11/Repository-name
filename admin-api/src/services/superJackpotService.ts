import { Pool } from 'pg';
import crypto from 'crypto';

/**
 * 超级大奖系统服务类
 * 实现约5960万分之一的中奖概率系统
 * 与分分时时彩开奖系统完全集成
 */
export class SuperJackpotService {
  private pool: Pool;

  // 核心概率常量
  private readonly TARGET_PROBABILITY = 1 / 59600000; // 约5960万分之一
  private readonly BASE_MULTIPLIER = 0.00168; // 基础触发倍数
  private readonly MAX_PROBABILITY = 0.001; // 最大概率限制 (千分之一)
  private readonly CONTRIBUTION_RATE = 0.001; // 奖金池贡献率 (0.1%)

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 超级大奖玩法设计
   * 方案：多期联合 + 概率控制算法
   */
  async createSuperJackpotGame() {
    const gameConfig = {
      name: '超级大奖',
      description: '连续预测多期开奖结果，实现超低概率超高奖金',
      
      // 方案1: 三期联合玩法
      multiPeriodGame: {
        periods: 3, // 连续3期
        baseProbability: 1 / 100000, // 单期5位数字概率
        combinedProbability: Math.pow(1 / 100000, 3), // 1/1,000,000,000,000,000
        note: '概率过低，不实用'
      },
      
      // 方案2: 概率控制算法（推荐）
      probabilityControlGame: {
        name: '智能超级大奖',
        baseProbability: 1 / 1000, // 基础概率（三字定位）
        targetProbability: this.TARGET_PROBABILITY,
        controlRatio: (1 / 1000) / this.TARGET_PROBABILITY, // 控制比例：59,600
        
        algorithm: {
          description: '通过算法控制，每59,600次基础中奖中只有1次触发超级大奖',
          implementation: 'weighted_random_selection',
          winRate: this.TARGET_PROBABILITY
        }
      },
      
      // 方案3: 累积奖池系统
      accumulativeJackpot: {
        name: '累积超级奖池',
        contribution: 0.1, // 每注投注的10%进入超级奖池
        triggerCondition: 'special_number_combination',
        specialNumbers: this.generateSpecialNumbers(),
        estimatedPeriods: 59600000 / 1440 // 约41,389天触发一次
      }
    };

    return gameConfig;
  }

  /**
   * 生成特殊号码组合
   * 用于触发超级大奖
   */
  private generateSpecialNumbers(): string[] {
    const specialCombinations = [
      '00000', '11111', '22222', '33333', '44444',
      '55555', '66666', '77777', '88888', '99999',
      '01234', '12345', '23456', '34567', '45678',
      '56789', '98765', '87654', '76543', '65432'
    ];
    
    return specialCombinations;
  }

  /**
   * 实现概率控制算法
   * 核心：在基础中奖的基础上，再进行二次概率判断
   */
  async checkSuperJackpot(
    userId: number,
    issueNo: string,
    betType: string,
    isBasicWin: boolean
  ): Promise<{
    isSuperJackpot: boolean;
    jackpotAmount?: number;
    algorithm: string;
  }> {
    
    if (!isBasicWin) {
      return { isSuperJackpot: false, algorithm: 'no_basic_win' };
    }

    // 方法1: 加权随机选择
    const superJackpotChance = await this.calculateSuperJackpotChance(userId, betType);
    
    // 生成安全随机数
    const randomBytes = crypto.randomBytes(8);
    const randomValue = randomBytes.readBigUInt64BE(0);
    const normalizedRandom = Number(randomValue) / Number(BigInt('0xFFFFFFFFFFFFFFFF'));
    
    const isSuperJackpot = normalizedRandom < superJackpotChance;
    
    if (isSuperJackpot) {
      const jackpotAmount = await this.getCurrentJackpotAmount();
      
      // 记录超级大奖
      await this.recordSuperJackpot(userId, issueNo, jackpotAmount);
      
      return {
        isSuperJackpot: true,
        jackpotAmount,
        algorithm: 'weighted_random_selection'
      };
    }

    return { isSuperJackpot: false, algorithm: 'probability_control' };
  }

  /**
   * 计算超级大奖概率
   * 基于用户历史、当前奖池、系统控制等因素
   */
  private async calculateSuperJackpotChance(
    userId: number,
    betType: string
  ): Promise<number> {
    
    // 基础概率控制
    const baseChance = this.TARGET_PROBABILITY / (1 / 1000); // 约 1.68e-11
    
    // 动态调整因子
    const adjustmentFactors = await this.getAdjustmentFactors(userId, betType);
    
    // 最终概率 = 基础概率 × 调整因子
    const finalChance = baseChance * adjustmentFactors.total;
    
    // 确保概率不超过合理范围
    return Math.min(finalChance, 0.001); // 最高0.1%
  }

  /**
   * 获取概率调整因子
   */
  private async getAdjustmentFactors(userId: number, betType: string) {
    // 查询用户历史数据
    const userStats = await this.getUserStats(userId);
    
    return {
      // 用户因子：新用户略高概率
      userFactor: userStats.isNewUser ? 2.0 : 1.0,
      
      // 投注因子：高额投注略高概率
      betFactor: userStats.totalBetAmount > 10000 ? 1.5 : 1.0,
      
      // 时间因子：特定时间段略高概率
      timeFactor: this.isSpecialTime() ? 1.2 : 1.0,
      
      // 奖池因子：奖池过大时提高概率
      jackpotFactor: await this.getJackpotFactor(),
      
      // 总调整因子
      get total() {
        return this.userFactor * this.betFactor * this.timeFactor * this.jackpotFactor;
      }
    };
  }

  /**
   * 获取用户统计信息
   */
  private async getUserStats(userId: number) {
    const result = await this.pool.query(`
      SELECT 
        COUNT(*) as bet_count,
        SUM(bet_amount) as total_bet_amount,
        MIN(created_at) as first_bet_time,
        COUNT(CASE WHEN win_amount > 0 THEN 1 END) as win_count
      FROM user_bets 
      WHERE user_id = $1
    `, [userId]);

    const stats = result.rows[0];
    const daysSinceFirstBet = stats.first_bet_time ? 
      (Date.now() - new Date(stats.first_bet_time).getTime()) / (1000 * 60 * 60 * 24) : 0;

    return {
      betCount: parseInt(stats.bet_count) || 0,
      totalBetAmount: parseFloat(stats.total_bet_amount) || 0,
      winCount: parseInt(stats.win_count) || 0,
      isNewUser: daysSinceFirstBet < 7, // 7天内算新用户
      winRate: stats.bet_count > 0 ? stats.win_count / stats.bet_count : 0
    };
  }

  /**
   * 判断是否为特殊时间
   */
  private isSpecialTime(): boolean {
    const now = new Date();
    const hour = now.getHours();
    
    // 黄金时间段：晚上8-10点
    return hour >= 20 && hour <= 22;
  }

  /**
   * 获取奖池调整因子
   */
  private async getJackpotFactor(): Promise<number> {
    const jackpotAmount = await this.getCurrentJackpotAmount();
    
    // 奖池超过1000万时，提高中奖概率
    if (jackpotAmount > 10000000) {
      return 2.0;
    } else if (jackpotAmount > 5000000) {
      return 1.5;
    } else {
      return 1.0;
    }
  }

  /**
   * 获取当前奖池金额
   */
  private async getCurrentJackpotAmount(): Promise<number> {
    const result = await this.pool.query(`
      SELECT COALESCE(SUM(amount), 0) as total
      FROM super_jackpot_pool
      WHERE status = 'active'
    `);

    return parseFloat(result.rows[0]?.total) || 1000000; // 默认100万起始奖池
  }

  /**
   * 记录超级大奖中奖
   */
  private async recordSuperJackpot(
    userId: number,
    issueNo: string,
    amount: number
  ): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      // 记录中奖记录
      await client.query(`
        INSERT INTO super_jackpot_winners (
          user_id, issue_no, amount, win_time, status
        ) VALUES ($1, $2, $3, NOW(), 'pending')
      `, [userId, issueNo, amount]);

      // 清空奖池
      await client.query(`
        UPDATE super_jackpot_pool 
        SET status = 'claimed', claimed_at = NOW()
        WHERE status = 'active'
      `);

      // 重新初始化奖池
      await client.query(`
        INSERT INTO super_jackpot_pool (amount, status, created_at)
        VALUES (1000000, 'active', NOW())
      `);

      await client.query('COMMIT');
      
      console.log(`🎉 超级大奖中奖！用户${userId}，期号${issueNo}，金额${amount}`);
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 向奖池贡献资金
   */
  async contributeToJackpot(amount: number): Promise<void> {
    await this.pool.query(`
      UPDATE super_jackpot_pool 
      SET amount = amount + $1, updated_at = NOW()
      WHERE status = 'active'
    `, [amount]);
  }

  /**
   * 获取超级大奖统计信息
   */
  async getJackpotStats() {
    const currentJackpot = await this.getCurrentJackpotAmount();
    
    const winnersResult = await this.pool.query(`
      SELECT COUNT(*) as total_winners, SUM(amount) as total_paid
      FROM super_jackpot_winners
      WHERE status = 'paid'
    `);

    const stats = winnersResult.rows[0];

    return {
      currentJackpot,
      totalWinners: parseInt(stats.total_winners) || 0,
      totalPaid: parseFloat(stats.total_paid) || 0,
      targetProbability: this.TARGET_PROBABILITY,
      estimatedDaysToWin: Math.round(1 / this.TARGET_PROBABILITY / 1440) // 假设每天1440期
    };
  }
}
