/**
 * 分分时时彩赔率管理器
 * 负责管理所有玩法的赔率配置
 */

import { Pool } from 'pg';
import { GameType, OddsConfig } from '../../../types/ssc';

export class OddsManager {
  private pool: Pool;
  private oddsCache: Map<string, number> = new Map();
  private lastCacheUpdate: Date = new Date(0);
  private cacheExpireTime: number = 5 * 60 * 1000; // 5分钟缓存

  constructor(pool: Pool) {
    this.pool = pool;
  }

  /**
   * 获取指定玩法的赔率
   * @param gameType 游戏类型
   * @param betType 投注类型
   */
  async getOdds(gameType: string, betType: string): Promise<number> {
    await this.refreshCacheIfNeeded();
    
    const key = `${gameType}_${betType}`;
    const odds = this.oddsCache.get(key);
    
    if (odds === undefined) {
      console.warn(`⚠️ 未找到赔率配置: ${gameType} - ${betType}`);
      return 1.0; // 默认赔率
    }
    
    return odds;
  }

  /**
   * 获取所有赔率配置
   */
  async getAllOdds(): Promise<Record<string, any>> {
    await this.refreshCacheIfNeeded();
    
    const odds = {
      // 数字盘赔率
      number: await this.getOdds('number', 'wan'),
      
      // 双面玩法赔率
      doubleFace: await this.getOdds('double_face', 'big_small'),
      
      // 牛牛赔率
      bull: {
        none: await this.getOdds('bull', 'none'),
        bull1: await this.getOdds('bull', 'bull1'),
        bull2: await this.getOdds('bull', 'bull2'),
        bull3: await this.getOdds('bull', 'bull3'),
        bull4: await this.getOdds('bull', 'bull4'),
        bull5: await this.getOdds('bull', 'bull5'),
        bull6: await this.getOdds('bull', 'bull6'),
        bull7: await this.getOdds('bull', 'bull7'),
        bull8: await this.getOdds('bull', 'bull8'),
        bull9: await this.getOdds('bull', 'bull9'),
        bullbull: await this.getOdds('bull', 'bullbull'),
      },
      
      // 牛双面赔率
      bullDouble: {
        big: await this.getOdds('bull_double', 'big'),
        small: await this.getOdds('bull_double', 'small'),
        odd: await this.getOdds('bull_double', 'odd'),
        even: await this.getOdds('bull_double', 'even'),
        prime: await this.getOdds('bull_double', 'prime'),
        composite: await this.getOdds('bull_double', 'composite'),
      },
      
      // 牛梭哈赔率
      poker: {
        fiveOfKind: await this.getOdds('poker', 'five_of_kind'),
        fourOfKind: await this.getOdds('poker', 'four_of_kind'),
        fullHouse: await this.getOdds('poker', 'full_house'),
        straight: await this.getOdds('poker', 'straight'),
        threeOfKind: await this.getOdds('poker', 'three_of_kind'),
        twoPair: await this.getOdds('poker', 'two_pair'),
        onePair: await this.getOdds('poker', 'one_pair'),
        highCard: await this.getOdds('poker', 'high_card'),
      },
      
      // 定位玩法赔率
      position: {
        one: await this.getOdds('position', 'one'),
        two: await this.getOdds('position', 'two'),
        three: await this.getOdds('position', 'three'),
      },
      
      // 跨度赔率
      span: {
        0: await this.getOdds('span', '0'),
        1: await this.getOdds('span', '1'),
        2: await this.getOdds('span', '2'),
        3: await this.getOdds('span', '3'),
        4: await this.getOdds('span', '4'),
        5: await this.getOdds('span', '5'),
        6: await this.getOdds('span', '6'),
        7: await this.getOdds('span', '7'),
        8: await this.getOdds('span', '8'),
        9: await this.getOdds('span', '9'),
      },
      
      // 龙虎赔率
      dragonTiger: {
        dragon: await this.getOdds('dragon_tiger', 'dragon'),
        tiger: await this.getOdds('dragon_tiger', 'tiger'),
        tie: await this.getOdds('dragon_tiger', 'tie'),
      },
    };
    
    return odds;
  }

  /**
   * 根据游戏类型和投注值获取赔率
   * @param gameType 游戏类型
   * @param betValue 投注值
   */
  async getOddsByGameType(gameType: GameType, betValue: any): Promise<number> {
    switch (gameType) {
      // 数字盘
      case 'number_wan':
      case 'number_qian':
      case 'number_bai':
      case 'number_shi':
      case 'number_ge':
        return await this.getOdds('number', 'wan');
      
      // 双面玩法
      case 'double_wan_big_small':
      case 'double_wan_odd_even':
      case 'double_wan_prime_composite':
      case 'double_qian_big_small':
      case 'double_qian_odd_even':
      case 'double_qian_prime_composite':
      case 'double_bai_big_small':
      case 'double_bai_odd_even':
      case 'double_bai_prime_composite':
      case 'double_shi_big_small':
      case 'double_shi_odd_even':
      case 'double_shi_prime_composite':
      case 'double_ge_big_small':
      case 'double_ge_odd_even':
      case 'double_ge_prime_composite':
      case 'double_sum_big_small':
      case 'double_sum_odd_even':
        return await this.getOdds('double_face', 'big_small');
      
      // 牛牛基础玩法
      case 'bull_basic':
        return await this.getOdds('bull', betValue);
      
      // 牛牛双面
      case 'bull_double_face':
        return await this.getOdds('bull_double', betValue);
      
      // 牛梭哈
      case 'bull_poker':
        return await this.getOdds('poker', betValue);
      
      // 定位玩法
      case 'position_one':
        return await this.getOdds('position', 'one');
      case 'position_two':
        return await this.getOdds('position', 'two');
      case 'position_three':
        return await this.getOdds('position', 'three');
      
      // 跨度玩法
      case 'span_front3':
      case 'span_middle3':
      case 'span_back3':
        return await this.getOdds('span', betValue.toString());
      
      // 龙虎玩法
      case 'dragon_tiger':
        return await this.getOdds('dragon_tiger', betValue);
      
      default:
        console.warn(`⚠️ 未知的游戏类型: ${gameType}`);
        return 1.0;
    }
  }

  /**
   * 更新赔率配置
   * @param gameType 游戏类型
   * @param betType 投注类型
   * @param odds 新赔率
   */
  async updateOdds(gameType: string, betType: string, odds: number): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query(
        `UPDATE ssc_odds_config 
         SET odds = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE game_type = $2 AND bet_type = $3`,
        [odds, gameType, betType]
      );
      
      // 清除缓存，强制重新加载
      this.clearCache();
      
      console.log(`✅ 更新赔率: ${gameType}-${betType} = ${odds}`);
    } finally {
      client.release();
    }
  }

  /**
   * 批量更新赔率配置
   * @param oddsUpdates 赔率更新数组
   */
  async batchUpdateOdds(oddsUpdates: Array<{
    gameType: string;
    betType: string;
    odds: number;
  }>): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      for (const update of oddsUpdates) {
        await client.query(
          `UPDATE ssc_odds_config 
           SET odds = $1, updated_at = CURRENT_TIMESTAMP 
           WHERE game_type = $2 AND bet_type = $3`,
          [update.odds, update.gameType, update.betType]
        );
      }
      
      await client.query('COMMIT');
      
      // 清除缓存
      this.clearCache();
      
      console.log(`✅ 批量更新赔率: ${oddsUpdates.length} 项`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * 刷新缓存（如果需要）
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date();
    
    if (now.getTime() - this.lastCacheUpdate.getTime() > this.cacheExpireTime) {
      await this.loadOddsFromDatabase();
    }
  }

  /**
   * 从数据库加载赔率配置
   */
  private async loadOddsFromDatabase(): Promise<void> {
    const client = await this.pool.connect();
    
    try {
      const result = await client.query(
        'SELECT game_type, bet_type, odds FROM ssc_odds_config WHERE is_active = true'
      );
      
      this.oddsCache.clear();
      
      for (const row of result.rows) {
        const key = `${row.game_type}_${row.bet_type}`;
        this.oddsCache.set(key, parseFloat(row.odds));
      }
      
      this.lastCacheUpdate = new Date();
      
      console.log(`📊 加载赔率配置: ${result.rows.length} 项`);
    } finally {
      client.release();
    }
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.oddsCache.clear();
    this.lastCacheUpdate = new Date(0);
    console.log('🗑️ 赔率缓存已清除');
  }

  /**
   * 获取缓存统计信息
   */
  getCacheStats(): {
    cacheSize: number;
    lastUpdate: Date;
    isExpired: boolean;
  } {
    const now = new Date();
    const isExpired = now.getTime() - this.lastCacheUpdate.getTime() > this.cacheExpireTime;
    
    return {
      cacheSize: this.oddsCache.size,
      lastUpdate: this.lastCacheUpdate,
      isExpired,
    };
  }
}
