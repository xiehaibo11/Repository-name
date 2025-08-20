/**
 * 分分时时彩中奖判断器
 * 负责判断各种玩法的中奖情况
 */

import { BetItem, DrawResult, GameType } from '../../../types/ssc';

export class WinChecker {
  /**
   * 检查投注是否中奖
   * @param betItem 投注明细
   * @param drawResult 开奖结果
   */
  checkWin(betItem: BetItem, drawResult: DrawResult): boolean {
    const { gameType, betValue } = betItem;
    const { numbers, calculated } = drawResult;
    
    try {
      const isWin = this.checkWinByGameType(gameType, betValue, numbers, calculated);
      
      console.log(`🎯 中奖判断: ${gameType} - ${JSON.stringify(betValue)} = ${isWin ? '中奖' : '未中奖'}`);
      
      return isWin;
    } catch (error) {
      console.error(`❌ 中奖判断失败: ${gameType}`, error);
      return false;
    }
  }

  /**
   * 根据游戏类型判断中奖
   */
  private checkWinByGameType(
    gameType: GameType, 
    betValue: any, 
    numbers: any, 
    calculated: any
  ): boolean {
    switch (gameType) {
      // 数字盘玩法
      case 'number_wan': return numbers.wan === betValue;
      case 'number_qian': return numbers.qian === betValue;
      case 'number_bai': return numbers.bai === betValue;
      case 'number_shi': return numbers.shi === betValue;
      case 'number_ge': return numbers.ge === betValue;
      
      // 双面玩法 - 各位大小
      case 'double_wan_big_small': 
        return calculated.positions.wan.bigSmall === betValue;
      case 'double_qian_big_small': 
        return calculated.positions.qian.bigSmall === betValue;
      case 'double_bai_big_small': 
        return calculated.positions.bai.bigSmall === betValue;
      case 'double_shi_big_small': 
        return calculated.positions.shi.bigSmall === betValue;
      case 'double_ge_big_small': 
        return calculated.positions.ge.bigSmall === betValue;
      
      // 双面玩法 - 各位单双
      case 'double_wan_odd_even': 
        return calculated.positions.wan.oddEven === betValue;
      case 'double_qian_odd_even': 
        return calculated.positions.qian.oddEven === betValue;
      case 'double_bai_odd_even': 
        return calculated.positions.bai.oddEven === betValue;
      case 'double_shi_odd_even': 
        return calculated.positions.shi.oddEven === betValue;
      case 'double_ge_odd_even': 
        return calculated.positions.ge.oddEven === betValue;
      
      // 双面玩法 - 各位质合
      case 'double_wan_prime_composite': 
        return calculated.positions.wan.primeComposite === betValue;
      case 'double_qian_prime_composite': 
        return calculated.positions.qian.primeComposite === betValue;
      case 'double_bai_prime_composite': 
        return calculated.positions.bai.primeComposite === betValue;
      case 'double_shi_prime_composite': 
        return calculated.positions.shi.primeComposite === betValue;
      case 'double_ge_prime_composite': 
        return calculated.positions.ge.primeComposite === betValue;
      
      // 总和双面
      case 'double_sum_big_small': 
        return calculated.sumBigSmall === betValue;
      case 'double_sum_odd_even': 
        return calculated.sumOddEven === betValue;
      
      // 牛牛玩法
      case 'bull_basic': 
        return calculated.bull.type === betValue;
      case 'bull_double_face': 
        return this.checkBullDoubleFace(calculated.bull, betValue);
      
      // 牛梭哈
      case 'bull_poker': 
        return calculated.poker.type === betValue;
      
      // 定位玩法
      case 'position_one': 
        return this.checkPositionOne(numbers, betValue);
      case 'position_two': 
        return this.checkPositionTwo(numbers, betValue);
      case 'position_three': 
        return this.checkPositionThree(numbers, betValue);
      
      // 跨度玩法
      case 'span_front3': 
        return calculated.spans.front3 === betValue;
      case 'span_middle3': 
        return calculated.spans.middle3 === betValue;
      case 'span_back3': 
        return calculated.spans.back3 === betValue;
      
      // 龙虎玩法
      case 'dragon_tiger': 
        return this.checkDragonTiger(calculated.dragonTiger, betValue);
      
      default:
        console.warn(`⚠️ 未知的游戏类型: ${gameType}`);
        return false;
    }
  }

  /**
   * 检查牛牛双面玩法
   */
  private checkBullDoubleFace(bull: any, betValue: any): boolean {
    const { type, value } = betValue;
    
    switch (type) {
      case 'big_small': 
        return bull.bigSmall === value;
      case 'odd_even': 
        return bull.oddEven === value;
      case 'prime_composite': 
        return bull.primeComposite === value;
      default: 
        return false;
    }
  }

  /**
   * 检查一字定位
   */
  private checkPositionOne(numbers: any, betValue: any): boolean {
    const { position, value } = betValue;
    return numbers[position] === value;
  }

  /**
   * 检查二字定位
   */
  private checkPositionTwo(numbers: any, betValue: any): boolean {
    const { positions, values } = betValue;
    return positions.every((pos: string, idx: number) => 
      numbers[pos] === values[idx]
    );
  }

  /**
   * 检查三字定位
   */
  private checkPositionThree(numbers: any, betValue: any): boolean {
    const { positions, values } = betValue;
    return positions.every((pos: string, idx: number) => 
      numbers[pos] === values[idx]
    );
  }

  /**
   * 检查龙虎玩法
   */
  private checkDragonTiger(result: string, betValue: any): boolean {
    const { positions, bet } = betValue;
    // positions: ['wan', 'ge'], bet: 'dragon'
    return result === bet;
  }

  /**
   * 批量检查中奖情况
   * @param betItems 投注明细数组
   * @param drawResult 开奖结果
   */
  batchCheckWin(betItems: BetItem[], drawResult: DrawResult): BetItem[] {
    return betItems.map(betItem => ({
      ...betItem,
      isWin: this.checkWin(betItem, drawResult),
      resultDescription: this.generateResultDescription(betItem, drawResult)
    }));
  }

  /**
   * 生成结果描述
   */
  private generateResultDescription(betItem: BetItem, drawResult: DrawResult): string {
    const { gameType, betValue } = betItem;
    const { numbers, calculated } = drawResult;
    
    switch (gameType) {
      case 'number_wan':
        return `万位开奖: ${numbers.wan}, 投注: ${betValue}`;
      case 'number_qian':
        return `千位开奖: ${numbers.qian}, 投注: ${betValue}`;
      case 'number_bai':
        return `百位开奖: ${numbers.bai}, 投注: ${betValue}`;
      case 'number_shi':
        return `十位开奖: ${numbers.shi}, 投注: ${betValue}`;
      case 'number_ge':
        return `个位开奖: ${numbers.ge}, 投注: ${betValue}`;
      
      case 'double_sum_big_small':
        return `和值: ${calculated.sum}(${calculated.sumBigSmall}), 投注: ${betValue}`;
      case 'double_sum_odd_even':
        return `和值: ${calculated.sum}(${calculated.sumOddEven}), 投注: ${betValue}`;
      
      case 'bull_basic':
        return `牛牛: ${calculated.bull.type}, 投注: ${betValue}`;
      
      case 'bull_poker':
        return `梭哈: ${calculated.poker.description}, 投注: ${betValue}`;
      
      case 'dragon_tiger':
        return `龙虎: ${calculated.dragonTiger}, 投注: ${betValue.bet}`;
      
      default:
        return `开奖号码: ${Object.values(numbers).join(',')}`;
    }
  }

  /**
   * 获取中奖统计
   * @param betItems 投注明细数组
   */
  getWinStatistics(betItems: BetItem[]): {
    totalBets: number;
    winBets: number;
    loseBets: number;
    winRate: number;
    totalAmount: number;
    totalWinAmount: number;
    profit: number;
  } {
    const totalBets = betItems.length;
    const winBets = betItems.filter(item => item.isWin).length;
    const loseBets = totalBets - winBets;
    const winRate = totalBets > 0 ? (winBets / totalBets) * 100 : 0;
    
    const totalAmount = betItems.reduce((sum, item) => sum + item.amount, 0);
    const totalWinAmount = betItems.reduce((sum, item) => sum + (item.winAmount || 0), 0);
    const profit = totalWinAmount - totalAmount;
    
    return {
      totalBets,
      winBets,
      loseBets,
      winRate: Math.round(winRate * 100) / 100,
      totalAmount,
      totalWinAmount,
      profit
    };
  }
}
