import { Pool } from 'pg';
import crypto from 'crypto';

/**
 * 增强版超级大奖系统服务类
 * 实现约5960万分之一的中奖概率系统
 * 与分分时时彩开奖系统完全集成
 */
export class EnhancedSuperJackpotService {
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
   * 检查并处理超级大奖触发
   * 这是主要的入口方法，在每期开奖时调用
   * @param issueId 期号ID
   * @param issueNo 期号
   * @param drawNumbers 开奖号码
   * @param allBets 所有投注记录
   * @returns 中奖记录数组
   */
  async processSuperJackpot(
    issueId: number,
    issueNo: string,
    drawNumbers: number[],
    allBets: any[]
  ): Promise<any[]> {
    const startTime = Date.now();
    
    try {
      // 1. 获取当前配置
      const config = await this.getCurrentConfig();
      if (!config.is_active) {
        await this.logJackpotEvent(issueId, issueNo, 'system_disabled', {
          total_bets: allBets.length,
          reason: 'Super jackpot system is disabled'
        });
        return [];
      }

      // 2. 筛选符合条件的投注
      const eligibleBets = this.filterEligibleBets(allBets, config.min_bet_amount);
      
      // 3. 计算触发概率
      const probability = await this.calculateTriggerProbability(
        eligibleBets,
        config
      );

      // 4. 生成安全随机数
      const randomValue = this.generateSecureRandom();

      // 5. 判断是否触发
      const isTriggered = randomValue < probability;

      // 6. 记录日志
      await this.logJackpotEvent(issueId, issueNo, 'probability_check', {
        total_bets: allBets.length,
        eligible_bets: eligibleBets.length,
        total_bet_amount: allBets.reduce((sum, bet) => sum + bet.amount, 0),
        base_probability: config.base_probability,
        final_probability: probability,
        random_value: randomValue,
        is_triggered: isTriggered,
        execution_time_ms: Date.now() - startTime
      });

      if (!isTriggered) {
        return [];
      }

      // 7. 查找潜在中奖者
      const potentialWinners = await this.findPotentialWinners(
        eligibleBets,
        drawNumbers
      );

      if (potentialWinners.length === 0) {
        await this.logJackpotEvent(issueId, issueNo, 'no_winners', {
          reason: 'No matching bets found for drawn numbers'
        });
        return [];
      }

      // 8. 选择中奖者
      const winners = await this.selectWinners(
        potentialWinners,
        config.max_winners_per_issue
      );

      // 9. 创建中奖记录
      const winnerRecords = await this.createWinnerRecords(
        issueId,
        issueNo,
        drawNumbers,
        winners,
        probability,
        randomValue
      );

      // 10. 记录成功日志
      await this.logJackpotEvent(issueId, issueNo, 'winners_selected', {
        winner_count: winnerRecords.length,
        total_payout: winnerRecords.reduce((sum, w) => sum + w.amount, 0),
        winners: winnerRecords.map(w => ({
          user_id: w.user_id,
          amount: w.amount,
          bet_type: w.bet_type
        }))
      });

      return winnerRecords;

    } catch (error) {
      console.error('Super jackpot processing error:', error);
      
      await this.logJackpotEvent(issueId, issueNo, 'processing_error', {
        error_message: error instanceof Error ? error.message : String(error),
        execution_time_ms: Date.now() - startTime
      });
      
      return [];
    }
  }

  /**
   * 计算触发概率
   */
  private async calculateTriggerProbability(
    eligibleBets: any[],
    config: any
  ): Promise<number> {
    
    let probability = config.base_probability;
    
    // 投注量调整因子
    const betVolumeMultiplier = Math.min(
      1 + (eligibleBets.length / 10000) * config.bet_volume_multiplier,
      2.0
    );
    
    // 奖金池调整因子
    const jackpotMultiplier = await this.getJackpotMultiplier(config);
    
    // 时间调整因子 (可以根据时间段调整概率)
    const timeMultiplier = this.getTimeMultiplier(config);
    
    // 最终概率计算
    probability *= betVolumeMultiplier * jackpotMultiplier * timeMultiplier;
    
    // 确保不超过最大概率限制
    return Math.min(probability, config.max_probability);
  }

  /**
   * 筛选符合条件的投注
   */
  private filterEligibleBets(allBets: any[], minBetAmount: number): any[] {
    return allBets.filter(bet => 
      bet.amount >= minBetAmount && 
      bet.status === 'active'
    );
  }

  /**
   * 查找潜在中奖者
   */
  private async findPotentialWinners(
    eligibleBets: any[],
    drawNumbers: number[]
  ): Promise<any[]> {
    
    const potentialWinners: any[] = [];
    
    for (const bet of eligibleBets) {
      const isMatch = this.checkBetMatch(bet, drawNumbers);
      
      if (isMatch) {
        potentialWinners.push({
          ...bet,
          match_type: this.getBetMatchType(bet, drawNumbers)
        });
      }
    }
    
    return potentialWinners;
  }

  /**
   * 检查投注是否与开奖号码匹配
   */
  private checkBetMatch(bet: any, drawNumbers: number[]): boolean {
    switch (bet.bet_type) {
      case 'number_play':
        return this.checkNumberPlayMatch(bet, drawNumbers);
      case 'double_side':
        return this.checkDoubleSideMatch(bet, drawNumbers);
      case 'niu_niu':
        return this.checkNiuNiuMatch(bet, drawNumbers);
      case 'positioning':
        return this.checkPositioningMatch(bet, drawNumbers);
      default:
        return false;
    }
  }

  /**
   * 数字盘玩法匹配检查
   */
  private checkNumberPlayMatch(bet: any, drawNumbers: number[]): boolean {
    const betData = JSON.parse(bet.bet_content);
    const position = betData.position; // 0-4 对应万千百十个
    const number = betData.number; // 0-9
    
    return drawNumbers[position] === number;
  }

  /**
   * 双面玩法匹配检查
   */
  private checkDoubleSideMatch(bet: any, drawNumbers: number[]): boolean {
    const betData = JSON.parse(bet.bet_content);
    const position = betData.position;
    const type = betData.type; // big, small, odd, even, prime, composite
    
    const number = drawNumbers[position];
    
    switch (type) {
      case 'big': return number >= 5;
      case 'small': return number <= 4;
      case 'odd': return number % 2 === 1;
      case 'even': return number % 2 === 0;
      case 'prime': return [1, 2, 3, 5, 7].includes(number);
      case 'composite': return [0, 4, 6, 8, 9].includes(number);
      default: return false;
    }
  }

  /**
   * 牛牛玩法匹配检查
   */
  private checkNiuNiuMatch(bet: any, drawNumbers: number[]): boolean {
    const betData = JSON.parse(bet.bet_content);
    const niuType = betData.niu_type; // 无牛, 牛一, 牛二, ..., 牛牛
    
    const actualNiu = this.calculateNiuNiu(drawNumbers);
    return actualNiu === niuType;
  }

  /**
   * 定位玩法匹配检查
   */
  private checkPositioningMatch(bet: any, drawNumbers: number[]): boolean {
    const betData = JSON.parse(bet.bet_content);
    const positions = betData.positions; // 选择的位置
    const numbers = betData.numbers; // 对应的数字
    
    for (let i = 0; i < positions.length; i++) {
      if (drawNumbers[positions[i]] !== numbers[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * 计算牛牛类型
   */
  private calculateNiuNiu(drawNumbers: number[]): string {
    // 实现牛牛计算逻辑
    // 这里简化处理，实际需要根据具体规则实现
    const sum = drawNumbers.reduce((a, b) => a + b, 0);
    if (sum % 10 === 0) return '牛牛';
    return `牛${sum % 10}`;
  }

  /**
   * 选择最终中奖者
   */
  private async selectWinners(
    potentialWinners: any[],
    maxWinners: number
  ): Promise<any[]> {
    
    if (potentialWinners.length <= maxWinners) {
      return potentialWinners;
    }
    
    // 随机选择中奖者，确保公平性
    const shuffled = potentialWinners.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, maxWinners);
  }

  /**
   * 生成加密安全的随机数
   */
  private generateSecureRandom(): number {
    // 使用更兼容的方式生成随机数
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    // 使用32位最大值，兼容ES2018
    return randomValue / 0xFFFFFFFF;
  }

  /**
   * 获取当前配置
   */
  private async getCurrentConfig(): Promise<any> {
    const result = await this.pool.query(
      'SELECT * FROM super_jackpot_config WHERE config_name = $1',
      ['default']
    );
    
    return result.rows[0] || {
      base_probability: this.TARGET_PROBABILITY,
      bet_volume_multiplier: 1.0,
      jackpot_multiplier: 1.0,
      time_multiplier: 1.0,
      max_probability: this.MAX_PROBABILITY,
      min_bet_amount: 10.00,
      max_winners_per_issue: 1,
      is_active: true
    };
  }

  /**
   * 获取当前奖金池金额
   */
  private async getCurrentJackpotAmount(): Promise<number> {
    const result = await this.pool.query(
      'SELECT current_amount FROM super_jackpot_pool WHERE id = 1'
    );
    
    return result.rows[0]?.current_amount || 1000000;
  }

  /**
   * 获取奖金池调整因子
   */
  private async getJackpotMultiplier(config: any): Promise<number> {
    const currentAmount = await this.getCurrentJackpotAmount();
    const baseAmount = 1000000; // 基础金额
    
    // 奖金池越大，触发概率略微增加
    return Math.min(1 + (currentAmount - baseAmount) / 10000000, 2.0) * config.jackpot_multiplier;
  }

  /**
   * 获取时间调整因子
   */
  private getTimeMultiplier(config: any): number {
    const now = new Date();
    const hour = now.getHours();
    
    // 可以根据时间段调整概率，比如晚上概率略高
    if (hour >= 20 || hour <= 2) {
      return 1.2 * config.time_multiplier;
    }
    
    return config.time_multiplier;
  }

  /**
   * 获取投注匹配类型
   */
  private getBetMatchType(bet: any, drawNumbers: number[]): string {
    // 根据不同玩法返回匹配类型描述
    switch (bet.bet_type) {
      case 'number_play': return 'exact_number_match';
      case 'double_side': return 'attribute_match';
      case 'niu_niu': return 'niu_pattern_match';
      case 'positioning': return 'position_combination_match';
      default: return 'unknown_match';
    }
  }

  /**
   * 添加奖金池贡献
   */
  async addJackpotContribution(
    userId: number,
    issueId: number,
    betId: number,
    betAmount: number
  ): Promise<void> {

    const contributionAmount = betAmount * this.CONTRIBUTION_RATE;

    await this.pool.query(`
      INSERT INTO super_jackpot_contributions (
        user_id, issue_id, bet_id, bet_amount,
        contribution_amount, contribution_rate
      ) VALUES ($1, $2, $3, $4, $5, $6)
    `, [userId, issueId, betId, betAmount, contributionAmount, this.CONTRIBUTION_RATE]);
  }

  /**
   * 创建中奖记录
   */
  private async createWinnerRecords(
    issueId: number,
    issueNo: string,
    drawNumbers: number[],
    winners: any[],
    probability: number,
    randomValue: number
  ): Promise<any[]> {

    const currentJackpot = await this.getCurrentJackpotAmount();
    const winnerRecords: any[] = [];

    for (const winner of winners) {
      const record = {
        user_id: winner.user_id,
        issue_id: issueId,
        issue_no: issueNo,
        bet_id: winner.id,
        amount: currentJackpot / winners.length, // 平分奖金
        draw_numbers: drawNumbers.join(','),
        bet_numbers: winner.bet_content,
        bet_type: winner.bet_type,
        bet_amount: winner.amount,
        probability_used: probability,
        random_value: randomValue,
        status: 'pending'
      };

      const result = await this.pool.query(`
        INSERT INTO super_jackpot_winners (
          user_id, issue_id, issue_no, bet_id, amount,
          draw_numbers, bet_numbers, bet_type, bet_amount,
          probability_used, random_value, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING *
      `, [
        record.user_id, record.issue_id, record.issue_no, record.bet_id,
        record.amount, record.draw_numbers, record.bet_numbers, record.bet_type,
        record.bet_amount, record.probability_used, record.random_value, record.status
      ]);

      winnerRecords.push(result.rows[0]);
    }

    return winnerRecords;
  }

  /**
   * 记录超级大奖事件日志
   */
  private async logJackpotEvent(
    issueId: number,
    issueNo: string,
    eventType: string,
    details: any
  ): Promise<void> {

    await this.pool.query(`
      INSERT INTO super_jackpot_logs (
        issue_id, issue_no, event_type, total_bets, total_bet_amount,
        eligible_bets, base_probability, final_probability, random_value,
        is_triggered, winner_count, total_payout, calculation_details,
        execution_time_ms
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      issueId, issueNo, eventType,
      details.total_bets || 0,
      details.total_bet_amount || 0,
      details.eligible_bets || 0,
      details.base_probability || 0,
      details.final_probability || 0,
      details.random_value || 0,
      details.is_triggered || false,
      details.winner_count || 0,
      details.total_payout || 0,
      JSON.stringify(details),
      details.execution_time_ms || 0
    ]);
  }

  /**
   * 获取超级大奖统计信息
   */
  async getJackpotStats(): Promise<any> {
    const currentJackpot = await this.getCurrentJackpotAmount();

    const winnersResult = await this.pool.query(`
      SELECT COUNT(*) as total_winners, SUM(amount) as total_paid
      FROM super_jackpot_winners
      WHERE status = 'paid'
    `);

    const poolResult = await this.pool.query(`
      SELECT total_contributions, total_payouts
      FROM super_jackpot_pool
      WHERE id = 1
    `);

    const stats = winnersResult.rows[0];
    const poolStats = poolResult.rows[0];

    return {
      currentJackpot,
      totalWinners: parseInt(stats.total_winners) || 0,
      totalPaid: parseFloat(stats.total_paid) || 0,
      totalContributions: parseFloat(poolStats?.total_contributions) || 0,
      totalPayouts: parseFloat(poolStats?.total_payouts) || 0,
      targetProbability: this.TARGET_PROBABILITY,
      estimatedDaysToWin: Math.round(1 / this.TARGET_PROBABILITY / 1440) // 假设每天1440期
    };
  }

  /**
   * 更新超级大奖配置
   */
  async updateConfig(configData: any): Promise<void> {
    await this.pool.query(`
      UPDATE super_jackpot_config
      SET base_probability = $1,
          bet_volume_multiplier = $2,
          jackpot_multiplier = $3,
          time_multiplier = $4,
          max_probability = $5,
          min_bet_amount = $6,
          max_winners_per_issue = $7,
          is_active = $8,
          updated_at = CURRENT_TIMESTAMP
      WHERE config_name = 'default'
    `, [
      configData.base_probability || this.TARGET_PROBABILITY,
      configData.bet_volume_multiplier || 1.0,
      configData.jackpot_multiplier || 1.0,
      configData.time_multiplier || 1.0,
      configData.max_probability || this.MAX_PROBABILITY,
      configData.min_bet_amount || 10.00,
      configData.max_winners_per_issue || 1,
      configData.is_active !== undefined ? configData.is_active : true
    ]);
  }

  /**
   * 支付超级大奖
   */
  async payoutSuperJackpot(winnerId: number, operatorId: number): Promise<void> {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // 更新中奖记录状态
      await client.query(`
        UPDATE super_jackpot_winners
        SET status = 'paid',
            paid_time = CURRENT_TIMESTAMP,
            paid_by = $2
        WHERE id = $1
      `, [winnerId, operatorId]);

      await client.query('COMMIT');

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}
