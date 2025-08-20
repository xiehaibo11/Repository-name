/**
 * 分分时时彩结果计算器
 * 负责计算开奖号码的所有属性和玩法结果
 */

import { CalculatedResult, PositionAttributes, BullResult, PokerResult } from '../../../types/ssc';

export class ResultCalculator {
  /**
   * 计算开奖结果的所有属性
   * @param numbers 开奖号码数组 [万,千,百,十,个]
   */
  calculateResult(numbers: number[]): CalculatedResult {
    const [wan, qian, bai, shi, ge] = numbers;
    
    console.log(`🧮 开始计算结果属性: ${numbers.join(',')}`);
    
    const result: CalculatedResult = {
      // 和值计算
      sum: this.calculateSum(numbers),
      sumBigSmall: this.calculateSumBigSmall(numbers),
      sumOddEven: this.calculateSumOddEven(numbers),
      
      // 各位属性
      positions: {
        wan: this.calculatePositionAttributes(wan),
        qian: this.calculatePositionAttributes(qian),
        bai: this.calculatePositionAttributes(bai),
        shi: this.calculatePositionAttributes(shi),
        ge: this.calculatePositionAttributes(ge),
      },
      
      // 龙虎 (万位 vs 个位)
      dragonTiger: this.calculateDragonTiger(wan, ge),
      
      // 奇偶统计
      oddEvenCount: this.calculateOddEvenCount(numbers),
      
      // 跨度
      spans: {
        front3: this.calculateSpan([wan, qian, bai]),
        middle3: this.calculateSpan([qian, bai, shi]),
        back3: this.calculateSpan([bai, shi, ge]),
      },
      
      // 牛牛
      bull: this.calculateBull(numbers),
      
      // 牛梭哈
      poker: this.calculatePoker(numbers),
    };
    
    console.log(`✅ 结果计算完成:`, {
      sum: result.sum,
      sumBigSmall: result.sumBigSmall,
      sumOddEven: result.sumOddEven,
      dragonTiger: result.dragonTiger,
      spans: result.spans,
      bull: result.bull.type,
      poker: result.poker.type
    });
    
    return result;
  }
  
  /**
   * 计算和值 (所有数字相加)
   */
  private calculateSum(numbers: number[]): number {
    return numbers.reduce((sum, num) => sum + num, 0);
  }
  
  /**
   * 计算和值大小 (23-45大, 0-22小)
   */
  private calculateSumBigSmall(numbers: number[]): 'big' | 'small' {
    const sum = this.calculateSum(numbers);
    return sum >= 23 ? 'big' : 'small';
  }
  
  /**
   * 计算和值单双
   */
  private calculateSumOddEven(numbers: number[]): 'odd' | 'even' {
    const sum = this.calculateSum(numbers);
    return sum % 2 === 0 ? 'even' : 'odd';
  }
  
  /**
   * 计算单个位置的属性
   */
  private calculatePositionAttributes(value: number): PositionAttributes {
    return {
      value,
      bigSmall: value >= 5 ? 'big' : 'small',           // 5-9大, 0-4小
      oddEven: value % 2 === 0 ? 'even' : 'odd',        // 奇偶
      primeComposite: [1, 2, 3, 5, 7].includes(value) ? 'prime' : 'composite', // 质合
    };
  }
  
  /**
   * 计算龙虎 (第1位 vs 第5位)
   */
  private calculateDragonTiger(first: number, last: number): 'dragon' | 'tiger' | 'tie' {
    if (first > last) return 'dragon';
    if (first < last) return 'tiger';
    return 'tie';
  }
  
  /**
   * 计算奇偶个数统计
   */
  private calculateOddEvenCount(numbers: number[]): { oddCount: number; evenCount: number } {
    const oddCount = numbers.filter(n => n % 2 === 1).length;
    return {
      oddCount,
      evenCount: 5 - oddCount,
    };
  }
  
  /**
   * 计算跨度 (最大值 - 最小值)
   */
  private calculateSpan(threeNumbers: number[]): number {
    const max = Math.max(...threeNumbers);
    const min = Math.min(...threeNumbers);
    return max - min;
  }
  
  /**
   * 计算牛牛结果
   * 规则: 任意三个数字相加为10的倍数，剩余两个数字相加的个位数为牛几
   */
  private calculateBull(numbers: number[]): BullResult {
    // 尝试所有三个数字的组合
    for (let i = 0; i < 5; i++) {
      for (let j = i + 1; j < 5; j++) {
        for (let k = j + 1; k < 5; k++) {
          const threeSum = numbers[i] + numbers[j] + numbers[k];

          if (threeSum % 10 === 0) {
            // 找到了三个数字和为10的倍数
            const remaining = numbers.filter((_, idx) => ![i, j, k].includes(idx));
            const remainingSum = remaining[0] + remaining[1];
            const bullValue = remainingSum % 10;

            const type = bullValue === 0 ? 'bullbull' : `bull${bullValue}` as any;
            const actualValue = bullValue === 0 ? 10 : bullValue;

            return {
              type,
              value: actualValue,
              bigSmall: actualValue >= 6 ? 'big' : 'small',
              oddEven: actualValue % 2 === 0 ? 'even' : 'odd',
              primeComposite: [1, 2, 3, 5, 7].includes(actualValue) ? 'prime' : 'composite',
            };
          }
        }
      }
    }

    // 无牛
    return {
      type: 'none',
      value: 0,
      bigSmall: 'small',
      oddEven: 'even',
      primeComposite: 'composite',
    };
  }
  
  /**
   * 计算牛梭哈结果
   */
  private calculatePoker(numbers: number[]): PokerResult {
    const counts = new Map<number, number>();
    numbers.forEach(n => {
      counts.set(n, (counts.get(n) || 0) + 1);
    });
    
    const countValues = Array.from(counts.values()).sort((a, b) => b - a);
    
    // 五条: 五个相同
    if (countValues[0] === 5) {
      return { type: 'fiveOfKind', description: '五条' };
    }
    
    // 炸弹: 四个相同
    if (countValues[0] === 4) {
      return { type: 'fourOfKind', description: '炸弹' };
    }
    
    // 葫芦: 三条+一对
    if (countValues[0] === 3 && countValues[1] === 2) {
      return { type: 'fullHouse', description: '葫芦' };
    }
    
    // 顺子检查
    if (this.isStraight(numbers)) {
      return { type: 'straight', description: '顺子' };
    }
    
    // 三条: 三个相同
    if (countValues[0] === 3) {
      return { type: 'threeOfKind', description: '三条' };
    }
    
    // 两对: 两组相同
    if (countValues[0] === 2 && countValues[1] === 2) {
      return { type: 'twoPair', description: '两对' };
    }
    
    // 单对: 一组相同
    if (countValues[0] === 2) {
      return { type: 'onePair', description: '单对' };
    }
    
    // 散号: 无任何组合
    return { type: 'highCard', description: '散号' };
  }
  
  /**
   * 检查是否为顺子
   * 包括特殊情况: 9,0,1,2,3 这样的顺子
   */
  private isStraight(numbers: number[]): boolean {
    const sorted = [...numbers].sort((a, b) => a - b);
    
    // 检查普通顺子
    let isNormalStraight = true;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] !== sorted[i-1] + 1) {
        isNormalStraight = false;
        break;
      }
    }
    
    if (isNormalStraight) return true;
    
    // 检查包含0的特殊顺子 (如 9,0,1,2,3)
    if (sorted.includes(0) && sorted.includes(9)) {
      // 将0当作10处理
      const withoutZero = sorted.filter(n => n !== 0);
      const withTen = [...withoutZero, 10].sort((a, b) => a - b);
      
      for (let i = 1; i < withTen.length; i++) {
        if (withTen[i] !== withTen[i-1] + 1) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  }
  
  /**
   * 获取详细的计算说明
   * 用于调试和日志记录
   */
  getCalculationDetails(numbers: number[]): string {
    const [wan, qian, bai, shi, ge] = numbers;
    const result = this.calculateResult(numbers);
    
    return `
开奖号码: ${numbers.join(',')}
和值: ${result.sum} (${result.sumBigSmall}/${result.sumOddEven})
各位: 万${wan}(${result.positions.wan.bigSmall}/${result.positions.wan.oddEven}/${result.positions.wan.primeComposite})
     千${qian}(${result.positions.qian.bigSmall}/${result.positions.qian.oddEven}/${result.positions.qian.primeComposite})
     百${bai}(${result.positions.bai.bigSmall}/${result.positions.bai.oddEven}/${result.positions.bai.primeComposite})
     十${shi}(${result.positions.shi.bigSmall}/${result.positions.shi.oddEven}/${result.positions.shi.primeComposite})
     个${ge}(${result.positions.ge.bigSmall}/${result.positions.ge.oddEven}/${result.positions.ge.primeComposite})
龙虎: ${result.dragonTiger} (万${wan} vs 个${ge})
奇偶: 奇${result.oddEvenCount.oddCount}个 偶${result.oddEvenCount.evenCount}个
跨度: 前三${result.spans.front3} 中三${result.spans.middle3} 后三${result.spans.back3}
牛牛: ${result.bull.type} (${result.bull.value})
梭哈: ${result.poker.description}
    `.trim();
  }
}
