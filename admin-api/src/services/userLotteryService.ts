import { Pool } from 'pg';

interface LotteryGameData {
  lottery_type: any;
  current_issue: any;
  next_issue: any;
  recent_draws: any[];
  game_rules: any;
}

interface BetAnalysis {
  wan_wei: { big: number; small: number; odd: number; even: number; prime: number; composite: number; };
  qian_wei: { big: number; small: number; odd: number; even: number; prime: number; composite: number; };
  bai_wei: { big: number; small: number; odd: number; even: number; prime: number; composite: number; };
  shi_wei: { big: number; small: number; odd: number; even: number; prime: number; composite: number; };
  ge_wei: { big: number; small: number; odd: number; even: number; prime: number; composite: number; };
  sum_analysis: { big: number; small: number; odd: number; even: number; };
  dragon_tiger: any;
  span_analysis: any;
}

export class UserLotteryService {
  private pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  // 获取彩种游戏数据
  async getLotteryGameData(lotteryCode: string): Promise<LotteryGameData> {
    // 获取彩种信息
    const lotteryResult = await this.pool.query(
      'SELECT * FROM lottery_types WHERE code = $1 AND status = $2',
      [lotteryCode, 'active']
    );

    if (lotteryResult.rows.length === 0) {
      throw new Error('彩种不存在或已停用');
    }

    const lotteryType = lotteryResult.rows[0];

    // 获取当前期号
    const currentIssueResult = await this.pool.query(`
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = $1 AND status = 'pending'
      ORDER BY draw_time ASC 
      LIMIT 1
    `, [lotteryType.id]);

    // 获取下一期号
    const nextIssueResult = await this.pool.query(`
      SELECT * FROM lottery_issues 
      WHERE lottery_type_id = $1 AND status = 'pending'
      ORDER BY draw_time ASC 
      LIMIT 1 OFFSET 1
    `, [lotteryType.id]);

    // 获取最近开奖记录
    const recentDrawsResult = await this.pool.query(`
      SELECT * FROM lottery_draws 
      WHERE lottery_type_id = $1 AND draw_status = 'drawn'
      ORDER BY draw_time DESC 
      LIMIT 20
    `, [lotteryType.id]);

    // 生成游戏规则
    const gameRules = this.generateGameRules(lotteryType);

    return {
      lottery_type: lotteryType,
      current_issue: currentIssueResult.rows[0] || null,
      next_issue: nextIssueResult.rows[0] || null,
      recent_draws: recentDrawsResult.rows,
      game_rules: gameRules
    };
  }

  // 生成游戏规则
  private generateGameRules(lotteryType: any): any {
    return {
      // 数字盘玩法
      number_play: {
        positions: ['万位', '千位', '百位', '十位', '个位'],
        numbers: Array.from({ length: 10 }, (_, i) => i),
        odds: 9.8
      },
      
      // 双面玩法
      double_side: {
        positions: {
          wan_wei: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98, prime: 1.98, composite: 1.98 },
          qian_wei: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98, prime: 1.98, composite: 1.98 },
          bai_wei: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98, prime: 1.98, composite: 1.98 },
          shi_wei: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98, prime: 1.98, composite: 1.98 },
          ge_wei: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98, prime: 1.98, composite: 1.98 }
        },
        sum_play: { big: 1.98, small: 1.98, odd: 1.98, even: 1.98 }
      },

      // 龙虎玩法
      dragon_tiger: {
        combinations: [
          { name: '万千龙虎', dragon: '万位', tiger: '千位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '万百龙虎', dragon: '万位', tiger: '百位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '万十龙虎', dragon: '万位', tiger: '十位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '万个龙虎', dragon: '万位', tiger: '个位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '千百龙虎', dragon: '千位', tiger: '百位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '千十龙虎', dragon: '千位', tiger: '十位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '千个龙虎', dragon: '千位', tiger: '个位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '百十龙虎', dragon: '百位', tiger: '十位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '百个龙虎', dragon: '百位', tiger: '个位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } },
          { name: '十个龙虎', dragon: '十位', tiger: '个位', odds: { dragon: 1.98, tiger: 1.98, tie: 9 } }
        ]
      },

      // 跨度玩法
      span_play: {
        positions: ['前三', '中三', '后三'],
        odds: {
          0: 71, 1: 14.8, 2: 8.1, 3: 6.2, 4: 5.4,
          5: 5.2, 6: 5.4, 7: 6.2, 8: 8.1, 9: 14.4
        }
      },

      // 定位玩法
      position_play: {
        one_digit: { odds: 9.8 },
        two_digit: { odds: 83 },
        three_digit: { odds: 690 }
      },

      // 牛牛玩法
      bull_play: {
        bull_types: {
          no_bull: 2.66, bull_1: 14.88, bull_2: 14.68, bull_3: 14.88,
          bull_4: 14.68, bull_5: 14.88, bull_6: 14.68, bull_7: 14.88,
          bull_8: 14.68, bull_9: 14.88, bull_bull: 14.68
        },
        bull_double_side: {
          bull_big: 2.68, bull_small: 2.88, bull_odd: 2.98,
          bull_even: 2.58, bull_prime: 2.96, bull_composite: 2.66
        },
        bull_poker: {
          five_kind: 9000, bomb: 200, full_house: 100, straight: 80,
          three_kind: 12.88, two_pair: 8.88, one_pair: 1.88, high_card: 2.98
        }
      }
    };
  }

  // 获取投注分析数据
  async getBetAnalysis(lotteryCode: string, limit: number = 100): Promise<BetAnalysis> {
    const lotteryResult = await this.pool.query(
      'SELECT id FROM lottery_types WHERE code = $1 AND status = $2',
      [lotteryCode, 'active']
    );

    if (lotteryResult.rows.length === 0) {
      throw new Error('彩种不存在或已停用');
    }

    const lotteryTypeId = lotteryResult.rows[0].id;

    // 获取最近的开奖记录
    const drawsResult = await this.pool.query(`
      SELECT wan_wei, qian_wei, bai_wei, shi_wei, ge_wei, sum_value, sum_big_small, sum_odd_even
      FROM lottery_draws 
      WHERE lottery_type_id = $1 AND draw_status = 'drawn'
      ORDER BY draw_time DESC 
      LIMIT $2
    `, [lotteryTypeId, limit]);

    const draws = drawsResult.rows;

    if (draws.length === 0) {
      // 返回默认分析数据
      return this.getDefaultAnalysis();
    }

    // 分析各位数字分布
    const analysis: BetAnalysis = {
      wan_wei: this.analyzePosition(draws.map(d => d.wan_wei)),
      qian_wei: this.analyzePosition(draws.map(d => d.qian_wei)),
      bai_wei: this.analyzePosition(draws.map(d => d.bai_wei)),
      shi_wei: this.analyzePosition(draws.map(d => d.shi_wei)),
      ge_wei: this.analyzePosition(draws.map(d => d.ge_wei)),
      sum_analysis: this.analyzeSumData(draws),
      dragon_tiger: this.analyzeDragonTiger(draws),
      span_analysis: this.analyzeSpan(draws)
    };

    return analysis;
  }

  // 分析单个位置的数字分布
  private analyzePosition(numbers: number[]): any {
    const total = numbers.length;
    if (total === 0) return { big: 0, small: 0, odd: 0, even: 0, prime: 0, composite: 0 };

    let big = 0, small = 0, odd = 0, even = 0, prime = 0, composite = 0;

    numbers.forEach(num => {
      // 大小
      if (num >= 5) big++; else small++;
      
      // 单双
      if (num % 2 === 1) odd++; else even++;
      
      // 质合
      if ([1, 2, 3, 5, 7].includes(num)) prime++; else composite++;
    });

    return {
      big: Math.round((big / total) * 100),
      small: Math.round((small / total) * 100),
      odd: Math.round((odd / total) * 100),
      even: Math.round((even / total) * 100),
      prime: Math.round((prime / total) * 100),
      composite: Math.round((composite / total) * 100)
    };
  }

  // 分析和值数据
  private analyzeSumData(draws: any[]): any {
    const total = draws.length;
    if (total === 0) return { big: 0, small: 0, odd: 0, even: 0 };

    let big = 0, small = 0, odd = 0, even = 0;

    draws.forEach(draw => {
      if (draw.sum_big_small === 'big') big++; else small++;
      if (draw.sum_odd_even === 'odd') odd++; else even++;
    });

    return {
      big: Math.round((big / total) * 100),
      small: Math.round((small / total) * 100),
      odd: Math.round((odd / total) * 100),
      even: Math.round((even / total) * 100)
    };
  }

  // 分析龙虎数据
  private analyzeDragonTiger(draws: any[]): any {
    const combinations = [
      { name: '万千', dragon: 'wan_wei', tiger: 'qian_wei' },
      { name: '万百', dragon: 'wan_wei', tiger: 'bai_wei' },
      { name: '万十', dragon: 'wan_wei', tiger: 'shi_wei' },
      { name: '万个', dragon: 'wan_wei', tiger: 'ge_wei' },
      { name: '千百', dragon: 'qian_wei', tiger: 'bai_wei' },
      { name: '千十', dragon: 'qian_wei', tiger: 'shi_wei' },
      { name: '千个', dragon: 'qian_wei', tiger: 'ge_wei' },
      { name: '百十', dragon: 'bai_wei', tiger: 'shi_wei' },
      { name: '百个', dragon: 'bai_wei', tiger: 'ge_wei' },
      { name: '十个', dragon: 'shi_wei', tiger: 'ge_wei' }
    ];

    const result: any = {};
    const total = draws.length;

    combinations.forEach(combo => {
      let dragon = 0, tiger = 0, tie = 0;

      draws.forEach(draw => {
        const dragonValue = draw[combo.dragon];
        const tigerValue = draw[combo.tiger];

        if (dragonValue > tigerValue) dragon++;
        else if (dragonValue < tigerValue) tiger++;
        else tie++;
      });

      result[combo.name] = {
        dragon: total > 0 ? Math.round((dragon / total) * 100) : 0,
        tiger: total > 0 ? Math.round((tiger / total) * 100) : 0,
        tie: total > 0 ? Math.round((tie / total) * 100) : 0
      };
    });

    return result;
  }

  // 分析跨度数据
  private analyzeSpan(draws: any[]): any {
    const positions = [
      { name: '前三', fields: ['wan_wei', 'qian_wei', 'bai_wei'] },
      { name: '中三', fields: ['qian_wei', 'bai_wei', 'shi_wei'] },
      { name: '后三', fields: ['bai_wei', 'shi_wei', 'ge_wei'] }
    ];

    const result: any = {};

    positions.forEach(pos => {
      const spanCounts = Array(10).fill(0);

      draws.forEach(draw => {
        const values = pos.fields.map(field => draw[field]);
        const max = Math.max(...values);
        const min = Math.min(...values);
        const span = max - min;
        spanCounts[span]++;
      });

      const total = draws.length;
      result[pos.name] = spanCounts.map(count =>
        total > 0 ? Math.round((count / total) * 100) : 0
      );
    });

    return result;
  }

  // 获取默认分析数据
  private getDefaultAnalysis(): BetAnalysis {
    const defaultPosition = { big: 50, small: 50, odd: 50, even: 50, prime: 50, composite: 50 };
    const defaultSum = { big: 50, small: 50, odd: 50, even: 50 };
    const defaultDragonTiger = { dragon: 45, tiger: 45, tie: 10 };

    return {
      wan_wei: defaultPosition,
      qian_wei: defaultPosition,
      bai_wei: defaultPosition,
      shi_wei: defaultPosition,
      ge_wei: defaultPosition,
      sum_analysis: defaultSum,
      dragon_tiger: {
        '万千': defaultDragonTiger, '万百': defaultDragonTiger, '万十': defaultDragonTiger,
        '万个': defaultDragonTiger, '千百': defaultDragonTiger, '千十': defaultDragonTiger,
        '千个': defaultDragonTiger, '百十': defaultDragonTiger, '百个': defaultDragonTiger,
        '十个': defaultDragonTiger
      },
      span_analysis: {
        '前三': [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        '中三': [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
        '后三': [10, 10, 10, 10, 10, 10, 10, 10, 10, 10]
      }
    };
  }
}
