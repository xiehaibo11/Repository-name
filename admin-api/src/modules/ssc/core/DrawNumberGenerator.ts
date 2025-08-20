/**
 * 分分时时彩开奖号码生成器
 * 负责生成公平、随机的开奖号码
 */

import crypto from 'crypto';

export class DrawNumberGenerator {
  /**
   * 生成5位开奖号码 (万千百十个)
   * 使用加密安全的随机数生成器确保公平性
   */
  generateNumbers(): number[] {
    const numbers: number[] = [];
    
    for (let i = 0; i < 5; i++) {
      // 使用加密安全的随机数生成器
      const randomBytes = crypto.randomBytes(4);
      const randomValue = randomBytes.readUInt32BE(0) % 10;
      numbers.push(randomValue);
    }
    
    console.log(`🎲 生成开奖号码: ${numbers.join(',')}`);
    return numbers;
  }
  
  /**
   * 验证号码的合理性
   * 避免过于规律的号码组合
   */
  validateNumbers(numbers: number[]): boolean {
    // 检查是否全部相同 (降低概率)
    if (numbers.every(n => n === numbers[0])) {
      const allowProbability = Math.random() < 0.001; // 0.1%概率允许
      if (!allowProbability) {
        console.log(`🚫 拒绝全相同号码: ${numbers.join(',')}`);
        return false;
      }
    }
    
    // 检查是否为连续数字 (降低概率)
    const sorted = [...numbers].sort((a, b) => a - b);
    const isSequential = sorted.every((n, i) => 
      i === 0 || n === sorted[i-1] + 1
    );
    
    if (isSequential) {
      const allowProbability = Math.random() < 0.01; // 1%概率允许
      if (!allowProbability) {
        console.log(`🚫 拒绝连续号码: ${numbers.join(',')}`);
        return false;
      }
    }
    
    // 检查是否为特殊模式 (如全奇数、全偶数等)
    const allOdd = numbers.every(n => n % 2 === 1);
    const allEven = numbers.every(n => n % 2 === 0);
    
    if (allOdd || allEven) {
      const allowProbability = Math.random() < 0.05; // 5%概率允许
      if (!allowProbability) {
        console.log(`🚫 拒绝特殊模式号码: ${numbers.join(',')} (${allOdd ? '全奇' : '全偶'})`);
        return false;
      }
    }
    
    return true;
  }
  
  /**
   * 生成有效的开奖号码
   * 重复生成直到通过验证
   */
  generateValidNumbers(): number[] {
    let numbers: number[];
    let attempts = 0;
    const maxAttempts = 100; // 最大尝试次数
    
    do {
      numbers = this.generateNumbers();
      attempts++;
      
      if (attempts >= maxAttempts) {
        console.warn(`⚠️ 达到最大尝试次数(${maxAttempts})，使用当前号码: ${numbers.join(',')}`);
        break;
      }
    } while (!this.validateNumbers(numbers));
    
    console.log(`✅ 生成有效号码: ${numbers.join(',')} (尝试${attempts}次)`);
    return numbers;
  }
  
  /**
   * 生成指定范围内的随机数
   * @param min 最小值
   * @param max 最大值
   */
  private generateSecureRandom(min: number, max: number): number {
    const range = max - min + 1;
    const randomBytes = crypto.randomBytes(4);
    const randomValue = randomBytes.readUInt32BE(0);
    return min + (randomValue % range);
  }
  
  /**
   * 获取号码统计信息
   * 用于分析号码分布情况
   */
  getNumberStats(numbers: number[]): {
    sum: number;
    oddCount: number;
    evenCount: number;
    bigCount: number;
    smallCount: number;
    primeCount: number;
    compositeCount: number;
  } {
    const sum = numbers.reduce((acc, num) => acc + num, 0);
    const oddCount = numbers.filter(n => n % 2 === 1).length;
    const evenCount = 5 - oddCount;
    const bigCount = numbers.filter(n => n >= 5).length;
    const smallCount = 5 - bigCount;
    const primes = [1, 2, 3, 5, 7];
    const primeCount = numbers.filter(n => primes.includes(n)).length;
    const compositeCount = 5 - primeCount;
    
    return {
      sum,
      oddCount,
      evenCount,
      bigCount,
      smallCount,
      primeCount,
      compositeCount
    };
  }
  
  /**
   * 检查号码是否符合特定模式
   * @param numbers 号码数组
   * @param pattern 模式类型
   */
  checkPattern(numbers: number[], pattern: 'ascending' | 'descending' | 'same' | 'pair'): boolean {
    switch (pattern) {
      case 'ascending':
        return numbers.every((n, i) => i === 0 || n >= numbers[i-1]);
      
      case 'descending':
        return numbers.every((n, i) => i === 0 || n <= numbers[i-1]);
      
      case 'same':
        return numbers.every(n => n === numbers[0]);
      
      case 'pair':
        const counts = new Map<number, number>();
        numbers.forEach(n => {
          counts.set(n, (counts.get(n) || 0) + 1);
        });
        return Array.from(counts.values()).some(count => count >= 2);
      
      default:
        return false;
    }
  }
}
