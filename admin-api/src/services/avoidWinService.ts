import { Pool, PoolClient } from 'pg';
import * as crypto from 'crypto';

/**
 * 避开中奖控制服务
 * 实现约5960万分之一的会员中奖概率
 * 系统主动避开会员投注号码，确保极低中奖率
 */
export class AvoidWinService {
  private readonly ALLOW_WIN_PROBABILITY = 1 / 59600000; // 约5960万分之一允许中奖
  private readonly MAX_ANALYSIS_TIME = 30000; // 最大分析时间30秒
  private readonly TOTAL_COMBINATIONS = 100000; // 00000-99999总组合数

  constructor(private pool: Pool) {}

  /**
   * 执行避开中奖的开奖逻辑
   */
  async performAvoidWinDraw(issueId: number, issueNo: string): Promise<number[]> {
    const startTime = Date.now();
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      // 1. 获取当期所有会员投注
      const allBets = await this.getCurrentIssueBets(client, issueId);
      
      // 2. 分析会员投注，计算所有可能中奖的号码组合
      const analysisResult = await this.analyzeMemberBets(client, issueId, issueNo, allBets);
      
      // 3. 生成安全随机数判断是否允许会员中奖
      const randomValue = this.generateSecureRandom();
      const allowMemberWin = randomValue < this.ALLOW_WIN_PROBABILITY;
      
      let drawNumbers: number[];
      let decisionType: string;
      
      if (allowMemberWin && analysisResult.winningCombinations.size > 0) {
        // 极小概率：允许会员中奖
        drawNumbers = this.selectFromWinningNumbers(analysisResult.winningCombinations);
        decisionType = 'member_win_allowed';
      } else {
        // 正常情况：避开所有会员中奖号码
        drawNumbers = this.selectAvoidWinNumbers(analysisResult.winningCombinations);
        decisionType = 'member_win_avoided';
      }
      
      const analysisTime = Date.now() - startTime;
      
      // 4. 记录决策日志
      await this.logDrawDecision(client, {
        issueId,
        issueNo,
        decisionType,
        drawNumbers,
        randomValue,
        totalBets: allBets.length,
        analyzedBets: analysisResult.validBets,
        winningCombinationsCount: analysisResult.winningCombinations.size,
        analysisTime,
        avoidedCombinations: Array.from(analysisResult.winningCombinations).slice(0, 100) // 只记录前100个
      });
      
      await client.query('COMMIT');
      
      console.log(`🎯 避开中奖决策完成 - 期号: ${issueNo}, 决策: ${decisionType}, 号码: ${drawNumbers.join(',')}`);
      
      return drawNumbers;
      
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('避开中奖决策失败:', error);
      
      // 发生错误时返回随机号码
      const fallbackNumbers = this.generateRandomNumbers();
      
      await this.logDrawDecision(client, {
        issueId,
        issueNo,
        decisionType: 'analysis_failed',
        drawNumbers: fallbackNumbers,
        randomValue: 0,
        totalBets: 0,
        analyzedBets: 0,
        winningCombinationsCount: 0,
        analysisTime: Date.now() - startTime,
        avoidedCombinations: []
      });
      
      return fallbackNumbers;
    } finally {
      client.release();
    }
  }

  /**
   * 获取当期所有会员投注
   */
  private async getCurrentIssueBets(client: PoolClient, issueId: number): Promise<any[]> {
    // 这里需要根据实际的投注表结构来查询
    // 假设有一个 lottery_bets 表
    const result = await client.query(`
      SELECT lb.*, m.id as member_id
      FROM lottery_bets lb
      JOIN members m ON lb.user_id = m.id
      WHERE lb.issue_id = $1 
        AND lb.status = 'active'
        AND lb.amount >= 1.00
      ORDER BY lb.created_at
    `, [issueId]);
    
    return result.rows;
  }

  /**
   * 分析会员投注，计算所有可能中奖的号码组合
   */
  private async analyzeMemberBets(
    client: PoolClient, 
    issueId: number, 
    issueNo: string, 
    allBets: any[]
  ): Promise<{
    winningCombinations: Set<string>;
    validBets: number;
    betTypeDistribution: any;
    positionDistribution: any;
    numberDistribution: any;
  }> {
    const startTime = Date.now();
    const winningCombinations = new Set<string>();
    const betTypeDistribution: any = {};
    const positionDistribution: any = {};
    const numberDistribution: any = {};
    let validBets = 0;
    
    for (const bet of allBets) {
      try {
        const possibleWins = this.calculatePossibleWinningNumbers(bet);
        possibleWins.forEach(combo => winningCombinations.add(combo));
        
        // 统计投注类型分布
        betTypeDistribution[bet.bet_type] = (betTypeDistribution[bet.bet_type] || 0) + 1;
        
        // 统计位置和数字分布
        this.updateDistributionStats(bet, positionDistribution, numberDistribution);
        
        validBets++;
        
        // 防止分析时间过长
        if (Date.now() - startTime > this.MAX_ANALYSIS_TIME) {
          console.warn(`投注分析超时，已分析${validBets}笔投注`);
          break;
        }
      } catch (error) {
        console.error(`分析投注失败:`, bet.id, error instanceof Error ? error.message : String(error));
      }
    }
    
    const analysisTime = Date.now() - startTime;
    const coveragePercentage = (winningCombinations.size / this.TOTAL_COMBINATIONS) * 100;
    
    // 记录分析结果
    await client.query(`
      INSERT INTO member_bet_analysis (
        issue_id, issue_no, total_bets, valid_bets, total_bet_amount,
        winning_combinations, bet_type_distribution, position_distribution, 
        number_distribution, analysis_result, analysis_time_ms, coverage_percentage
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      issueId, issueNo, allBets.length, validBets,
      allBets.reduce((sum, bet) => sum + parseFloat(bet.amount), 0),
      JSON.stringify(Array.from(winningCombinations).slice(0, 1000)), // 只存储前1000个
      JSON.stringify(betTypeDistribution),
      JSON.stringify(positionDistribution),
      JSON.stringify(numberDistribution),
      'success',
      analysisTime,
      coveragePercentage
    ]);
    
    return {
      winningCombinations,
      validBets,
      betTypeDistribution,
      positionDistribution,
      numberDistribution
    };
  }

  /**
   * 根据投注类型计算可能中奖的开奖号码
   */
  private calculatePossibleWinningNumbers(bet: any): string[] {
    const possibleWins: string[] = [];
    
    try {
      const betData = JSON.parse(bet.bet_content);
      
      switch (bet.bet_type) {
        case 'number_play':
          possibleWins.push(...this.getNumberPlayWins(betData));
          break;
          
        case 'double_side':
          possibleWins.push(...this.getDoubleSideWins(betData));
          break;
          
        case 'positioning':
          possibleWins.push(...this.getPositioningWins(betData));
          break;
          
        case 'niu_niu':
          possibleWins.push(...this.getNiuNiuWins(betData));
          break;
          
        default:
          console.warn(`未知的投注类型: ${bet.bet_type}`);
      }
    } catch (error) {
      console.error(`解析投注内容失败:`, bet.bet_content, error instanceof Error ? error.message : String(error));
    }
    
    return possibleWins;
  }

  /**
   * 数字盘中奖号码计算
   */
  private getNumberPlayWins(betData: any): string[] {
    const wins: string[] = [];
    const { position, number } = betData; // position: 0-4, number: 0-9
    
    // 生成所有在指定位置包含指定数字的5位数组合
    for (let i = 0; i < this.TOTAL_COMBINATIONS; i++) {
      const numbers = this.numberToFiveDigits(i);
      if (numbers[position] === number) {
        wins.push(numbers.join(''));
      }
    }
    
    return wins;
  }

  /**
   * 双面玩法中奖号码计算
   */
  private getDoubleSideWins(betData: any): string[] {
    const wins: string[] = [];
    const { position, type } = betData; // type: big, small, odd, even, prime, composite
    
    for (let i = 0; i < this.TOTAL_COMBINATIONS; i++) {
      const numbers = this.numberToFiveDigits(i);
      const digit = numbers[position];
      
      let isWin = false;
      switch (type) {
        case 'big': isWin = digit >= 5; break;
        case 'small': isWin = digit <= 4; break;
        case 'odd': isWin = digit % 2 === 1; break;
        case 'even': isWin = digit % 2 === 0; break;
        case 'prime': isWin = [1,2,3,5,7].includes(digit); break;
        case 'composite': isWin = [0,4,6,8,9].includes(digit); break;
      }
      
      if (isWin) {
        wins.push(numbers.join(''));
      }
    }
    
    return wins;
  }

  /**
   * 定位玩法中奖号码计算
   */
  private getPositioningWins(betData: any): string[] {
    const wins: string[] = [];
    const { positions, numbers } = betData; // positions: [0,1], numbers: [5,6]
    
    for (let i = 0; i < this.TOTAL_COMBINATIONS; i++) {
      const drawNumbers = this.numberToFiveDigits(i);
      let isWin = true;
      
      for (let j = 0; j < positions.length; j++) {
        if (drawNumbers[positions[j]] !== numbers[j]) {
          isWin = false;
          break;
        }
      }
      
      if (isWin) {
        wins.push(drawNumbers.join(''));
      }
    }
    
    return wins;
  }

  /**
   * 牛牛玩法中奖号码计算
   */
  private getNiuNiuWins(betData: any): string[] {
    const wins: string[] = [];
    const { niu_type } = betData; // niu_type: 'niu_0' to 'niu_9', 'niu_niu'
    
    for (let i = 0; i < this.TOTAL_COMBINATIONS; i++) {
      const numbers = this.numberToFiveDigits(i);
      const calculatedNiu = this.calculateNiuNiu(numbers);
      
      if (calculatedNiu === niu_type) {
        wins.push(numbers.join(''));
      }
    }
    
    return wins;
  }

  /**
   * 计算牛牛类型
   */
  private calculateNiuNiu(numbers: number[]): string {
    const sum = numbers.reduce((a, b) => a + b, 0);
    const remainder = sum % 10;
    
    if (remainder === 0) {
      return 'niu_niu';
    } else {
      return `niu_${remainder}`;
    }
  }

  /**
   * 选择避开会员中奖的号码
   */
  private selectAvoidWinNumbers(memberWinningNumbers: Set<string>): number[] {
    let attempts = 0;
    const maxAttempts = 1000;
    
    while (attempts < maxAttempts) {
      const randomNum = Math.floor(Math.random() * this.TOTAL_COMBINATIONS);
      const numbers = this.numberToFiveDigits(randomNum);
      const numberString = numbers.join('');
      
      // 检查这个号码是否会让会员中奖
      if (!memberWinningNumbers.has(numberString)) {
        return numbers;
      }
      
      attempts++;
    }
    
    // 如果所有号码都会让会员中奖（极端情况），随机选择一个
    console.warn('所有号码都会让会员中奖，随机选择');
    const randomNum = Math.floor(Math.random() * this.TOTAL_COMBINATIONS);
    return this.numberToFiveDigits(randomNum);
  }

  /**
   * 从中奖号码中选择（极少数情况）
   */
  private selectFromWinningNumbers(winningCombinations: Set<string>): number[] {
    const winningArray = Array.from(winningCombinations);
    const randomIndex = Math.floor(Math.random() * winningArray.length);
    const selectedCombo = winningArray[randomIndex];
    
    return selectedCombo.split('').map(n => parseInt(n));
  }

  /**
   * 数字转换为5位数组
   */
  private numberToFiveDigits(num: number): number[] {
    const str = num.toString().padStart(5, '0');
    return str.split('').map(n => parseInt(n));
  }

  /**
   * 生成随机5位数
   */
  private generateRandomNumbers(): number[] {
    const randomNum = Math.floor(Math.random() * this.TOTAL_COMBINATIONS);
    return this.numberToFiveDigits(randomNum);
  }

  /**
   * 生成加密安全的随机数
   */
  private generateSecureRandom(): number {
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    return randomValue / 0xFFFFFFFF;
  }

  /**
   * 更新分布统计
   */
  private updateDistributionStats(bet: any, positionDistribution: any, numberDistribution: any): void {
    try {
      const betData = JSON.parse(bet.bet_content);
      
      if (betData.position !== undefined) {
        positionDistribution[betData.position] = (positionDistribution[betData.position] || 0) + 1;
      }
      
      if (betData.number !== undefined) {
        numberDistribution[betData.number] = (numberDistribution[betData.number] || 0) + 1;
      }
    } catch (error) {
      // 忽略解析错误
    }
  }

  /**
   * 记录开奖决策日志
   */
  private async logDrawDecision(client: PoolClient, logData: {
    issueId: number;
    issueNo: string;
    decisionType: string;
    drawNumbers: number[];
    randomValue: number;
    totalBets: number;
    analyzedBets: number;
    winningCombinationsCount: number;
    analysisTime: number;
    avoidedCombinations: string[];
  }): Promise<void> {
    await client.query(`
      INSERT INTO avoid_win_logs (
        issue_id, issue_no, decision_type, draw_numbers, random_value,
        probability_used, total_bets, analyzed_bets, winning_combinations_count,
        analysis_time_ms, avoided_combinations, decision_details
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      logData.issueId,
      logData.issueNo,
      logData.decisionType,
      logData.drawNumbers.join(','),
      logData.randomValue,
      this.ALLOW_WIN_PROBABILITY,
      logData.totalBets,
      logData.analyzedBets,
      logData.winningCombinationsCount,
      logData.analysisTime,
      JSON.stringify(logData.avoidedCombinations),
      JSON.stringify({
        coverage_percentage: (logData.winningCombinationsCount / this.TOTAL_COMBINATIONS) * 100,
        analysis_timeout: logData.analysisTime > this.MAX_ANALYSIS_TIME,
        random_threshold: this.ALLOW_WIN_PROBABILITY
      })
    ]);
  }

  /**
   * 获取系统配置
   */
  async getSystemConfig(): Promise<any> {
    const result = await this.pool.query(`
      SELECT * FROM avoid_win_config WHERE config_name = 'default'
    `);
    
    return result.rows[0] || null;
  }

  /**
   * 更新系统配置
   */
  async updateSystemConfig(configData: any, operatorId?: number): Promise<void> {
    await this.pool.query(`
      UPDATE avoid_win_config 
      SET allow_win_probability = COALESCE($1, allow_win_probability),
          system_enabled = COALESCE($2, system_enabled),
          min_bet_amount = COALESCE($3, min_bet_amount),
          max_analysis_combinations = COALESCE($4, max_analysis_combinations),
          analysis_timeout_seconds = COALESCE($5, analysis_timeout_seconds),
          description = COALESCE($6, description),
          updated_by = $7,
          updated_at = CURRENT_TIMESTAMP
      WHERE config_name = 'default'
    `, [
      configData.allow_win_probability,
      configData.system_enabled,
      configData.min_bet_amount,
      configData.max_analysis_combinations,
      configData.analysis_timeout_seconds,
      configData.description,
      operatorId
    ]);
  }
}
