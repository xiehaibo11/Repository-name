/**
 * 分分时时彩核心实现示例
 * 基于玩法文档的完整实现
 */

import crypto from 'crypto';

// ==================== 数据类型定义 ====================

interface DrawResult {
  issueNo: string;
  drawTime: Date;
  numbers: {
    wan: number;
    qian: number;
    bai: number;
    shi: number;
    ge: number;
  };
  calculated: CalculatedResult;
}

interface CalculatedResult {
  sum: number;
  sumBigSmall: 'big' | 'small';
  sumOddEven: 'odd' | 'even';
  positions: {
    wan: PositionAttributes;
    qian: PositionAttributes;
    bai: PositionAttributes;
    shi: PositionAttributes;
    ge: PositionAttributes;
  };
  dragonTiger: 'dragon' | 'tiger' | 'tie';
  oddEvenCount: { oddCount: number; evenCount: number };
  spans: { front3: number; middle3: number; back3: number };
  bull: BullResult;
  poker: PokerResult;
}

interface PositionAttributes {
  value: number;
  bigSmall: 'big' | 'small';
  oddEven: 'odd' | 'even';
  primeComposite: 'prime' | 'composite';
}

interface BullResult {
  type: string;
  value: number;
  bigSmall: 'big' | 'small';
  oddEven: 'odd' | 'even';
  primeComposite: 'prime' | 'composite';
}

interface PokerResult {
  type: string;
  description: string;
}

// ==================== 核心实现类 ====================

/**
 * 开奖号码生成器
 * 确保随机性和公平性
 */
class DrawNumberGenerator {
  /**
   * 生成5位开奖号码 (万千百十个)
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
   */
  validateNumbers(numbers: number[]): boolean {
    // 检查是否全部相同 (降低概率)
    if (numbers.every(n => n === numbers[0])) {
      return Math.random() < 0.001; // 0.1%概率允许
    }
    
    // 检查是否为连续数字 (降低概率)
    const sorted = [...numbers].sort((a, b) => a - b);
    const isSequential = sorted.every((n, i) => 
      i === 0 || n === sorted[i-1] + 1
    );
    
    if (isSequential) {
      return Math.random() < 0.01; // 1%概率允许
    }
    
    return true;
  }
}

/**
 * 结果计算引擎
 * 计算所有玩法的结果属性
 */
class ResultCalculator {
  /**
   * 计算开奖结果的所有属性
   */
  calculateResult(numbers: number[]): CalculatedResult {
    const [wan, qian, bai, shi, ge] = numbers;
    
    console.log(`🧮 开始计算结果属性...`);
    
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
            
            const type = bullValue === 0 ? 'bullbull' : `bull${bullValue}`;
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
}

/**
 * 期号生成器
 */
class IssueGenerator {
  /**
   * 生成当前期号 (格式: YYYYMMDDHHMM)
   */
  generateCurrentIssue(): string {
    const now = new Date();
    const year = now.getFullYear().toString();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    const day = now.getDate().toString().padStart(2, '0');
    const hour = now.getHours().toString().padStart(2, '0');
    const minute = now.getMinutes().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }
  
  /**
   * 生成下一期号
   */
  generateNextIssue(currentIssue: string): string {
    const currentTime = this.parseIssueToDate(currentIssue);
    const nextTime = new Date(currentTime.getTime() + 60 * 1000); // 加1分钟
    
    return this.formatDateToIssue(nextTime);
  }
  
  /**
   * 解析期号为日期
   */
  parseIssueToDate(issue: string): Date {
    const year = parseInt(issue.substring(0, 4));
    const month = parseInt(issue.substring(4, 6)) - 1;
    const day = parseInt(issue.substring(6, 8));
    const hour = parseInt(issue.substring(8, 10));
    const minute = parseInt(issue.substring(10, 12));
    
    return new Date(year, month, day, hour, minute);
  }
  
  /**
   * 格式化日期为期号
   */
  formatDateToIssue(date: Date): string {
    const year = date.getFullYear().toString();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hour = date.getHours().toString().padStart(2, '0');
    const minute = date.getMinutes().toString().padStart(2, '0');
    
    return `${year}${month}${day}${hour}${minute}`;
  }
}

// ==================== 使用示例 ====================

/**
 * 完整的开奖流程示例
 */
async function demonstrateDrawProcess() {
  console.log('🎯 分分时时彩开奖流程演示');
  console.log('================================');
  
  // 1. 生成期号
  const issueGenerator = new IssueGenerator();
  const issueNo = issueGenerator.generateCurrentIssue();
  console.log(`📅 当前期号: ${issueNo}`);
  
  // 2. 生成开奖号码
  const numberGenerator = new DrawNumberGenerator();
  let numbers: number[];
  
  do {
    numbers = numberGenerator.generateNumbers();
  } while (!numberGenerator.validateNumbers(numbers));
  
  // 3. 计算所有结果属性
  const calculator = new ResultCalculator();
  const calculated = calculator.calculateResult(numbers);
  
  // 4. 构建完整结果
  const result: DrawResult = {
    issueNo,
    drawTime: new Date(),
    numbers: {
      wan: numbers[0],
      qian: numbers[1],
      bai: numbers[2],
      shi: numbers[3],
      ge: numbers[4],
    },
    calculated,
  };
  
  // 5. 输出完整结果
  console.log('\n🎉 开奖结果:');
  console.log(`期号: ${result.issueNo}`);
  console.log(`号码: ${Object.values(result.numbers).join(' ')}`);
  console.log(`和值: ${result.calculated.sum} (${result.calculated.sumBigSmall}/${result.calculated.sumOddEven})`);
  console.log(`龙虎: ${result.calculated.dragonTiger} (万${result.numbers.wan} vs 个${result.numbers.ge})`);
  console.log(`跨度: 前三${result.calculated.spans.front3} 中三${result.calculated.spans.middle3} 后三${result.calculated.spans.back3}`);
  console.log(`牛牛: ${result.calculated.bull.type} (${result.calculated.bull.value})`);
  console.log(`梭哈: ${result.calculated.poker.description}`);
  console.log(`奇偶: 奇${result.calculated.oddEvenCount.oddCount}个 偶${result.calculated.oddEvenCount.evenCount}个`);
  
  return result;
}

// 运行演示
if (require.main === module) {
  demonstrateDrawProcess().catch(console.error);
}

export {
  DrawNumberGenerator,
  ResultCalculator,
  IssueGenerator,
  DrawResult,
  CalculatedResult
};
