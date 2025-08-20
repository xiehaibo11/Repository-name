// 开发环境暂时禁用 Redis，但保留缓存服务代码以备后用
import { redisService } from '../config/redis';

export class CacheService {
  // 缓存键前缀
  private static readonly PREFIXES = {
    USER_SESSION: 'session:',
    USER_TOKEN: 'token:',
    RATE_LIMIT: 'rate_limit:',
    TEMP_DATA: 'temp:',
    MEMBER_DATA: 'member:',
    BALANCE_LOCK: 'balance_lock:'
  };

  // 默认过期时间（秒）
  private static readonly DEFAULT_TTL = {
    SESSION: 24 * 60 * 60, // 24小时
    TOKEN: 7 * 24 * 60 * 60, // 7天
    RATE_LIMIT: 15 * 60, // 15分钟
    TEMP_DATA: 60 * 60, // 1小时
    BALANCE_LOCK: 30 // 30秒
  };

  /**
   * 设置用户会话缓存
   */
  static async setUserSession(userId: number, sessionData: any, ttl?: number): Promise<boolean> {
    const key = `${this.PREFIXES.USER_SESSION}${userId}`;
    const value = JSON.stringify(sessionData);
    return await redisService.set(key, value, ttl || this.DEFAULT_TTL.SESSION);
  }

  /**
   * 获取用户会话缓存
   */
  static async getUserSession(userId: number): Promise<any | null> {
    const key = `${this.PREFIXES.USER_SESSION}${userId}`;
    const value = await redisService.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * 删除用户会话缓存
   */
  static async deleteUserSession(userId: number): Promise<boolean> {
    const key = `${this.PREFIXES.USER_SESSION}${userId}`;
    const result = await redisService.del(key);
    return result > 0;
  }

  /**
   * 设置用户令牌缓存
   */
  static async setUserToken(tokenId: string, userData: any, ttl?: number): Promise<boolean> {
    const key = `${this.PREFIXES.USER_TOKEN}${tokenId}`;
    const value = JSON.stringify(userData);
    return await redisService.set(key, value, ttl || this.DEFAULT_TTL.TOKEN);
  }

  /**
   * 获取用户令牌缓存
   */
  static async getUserToken(tokenId: string): Promise<any | null> {
    const key = `${this.PREFIXES.USER_TOKEN}${tokenId}`;
    const value = await redisService.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * 删除用户令牌缓存
   */
  static async deleteUserToken(tokenId: string): Promise<boolean> {
    const key = `${this.PREFIXES.USER_TOKEN}${tokenId}`;
    const result = await redisService.del(key);
    return result > 0;
  }

  /**
   * 设置限流缓存
   */
  static async setRateLimit(identifier: string, count: number, ttl?: number): Promise<boolean> {
    const key = `${this.PREFIXES.RATE_LIMIT}${identifier}`;
    return await redisService.set(key, count.toString(), ttl || this.DEFAULT_TTL.RATE_LIMIT);
  }

  /**
   * 获取限流计数
   */
  static async getRateLimit(identifier: string): Promise<number> {
    const key = `${this.PREFIXES.RATE_LIMIT}${identifier}`;
    const value = await redisService.get(key);
    return value ? parseInt(value) : 0;
  }

  /**
   * 增加限流计数
   */
  static async incrementRateLimit(identifier: string, ttl?: number): Promise<number> {
    const current = await this.getRateLimit(identifier);
    const newCount = current + 1;
    await this.setRateLimit(identifier, newCount, ttl);
    return newCount;
  }

  /**
   * 设置临时数据缓存
   */
  static async setTempData(key: string, data: any, ttl?: number): Promise<boolean> {
    const cacheKey = `${this.PREFIXES.TEMP_DATA}${key}`;
    const value = JSON.stringify(data);
    return await redisService.set(cacheKey, value, ttl || this.DEFAULT_TTL.TEMP_DATA);
  }

  /**
   * 获取临时数据缓存
   */
  static async getTempData(key: string): Promise<any | null> {
    const cacheKey = `${this.PREFIXES.TEMP_DATA}${key}`;
    const value = await redisService.get(cacheKey);
    return value ? JSON.parse(value) : null;
  }

  /**
   * 删除临时数据缓存
   */
  static async deleteTempData(key: string): Promise<boolean> {
    const cacheKey = `${this.PREFIXES.TEMP_DATA}${key}`;
    const result = await redisService.del(cacheKey);
    return result > 0;
  }

  /**
   * 设置会员数据缓存
   */
  static async setMemberData(memberId: number, memberData: any, ttl?: number): Promise<boolean> {
    const key = `${this.PREFIXES.MEMBER_DATA}${memberId}`;
    const value = JSON.stringify(memberData);
    return await redisService.set(key, value, ttl || this.DEFAULT_TTL.TEMP_DATA);
  }

  /**
   * 获取会员数据缓存
   */
  static async getMemberData(memberId: number): Promise<any | null> {
    const key = `${this.PREFIXES.MEMBER_DATA}${memberId}`;
    const value = await redisService.get(key);
    return value ? JSON.parse(value) : null;
  }

  /**
   * 删除会员数据缓存
   */
  static async deleteMemberData(memberId: number): Promise<boolean> {
    const key = `${this.PREFIXES.MEMBER_DATA}${memberId}`;
    const result = await redisService.del(key);
    return result > 0;
  }

  /**
   * 设置余额操作锁
   */
  static async setBalanceLock(memberId: number, operationId: string, ttl?: number): Promise<boolean> {
    const key = `${this.PREFIXES.BALANCE_LOCK}${memberId}`;
    return await redisService.set(key, operationId, ttl || this.DEFAULT_TTL.BALANCE_LOCK);
  }

  /**
   * 检查余额操作锁
   */
  static async checkBalanceLock(memberId: number): Promise<string | null> {
    const key = `${this.PREFIXES.BALANCE_LOCK}${memberId}`;
    return await redisService.get(key);
  }

  /**
   * 释放余额操作锁
   */
  static async releaseBalanceLock(memberId: number): Promise<boolean> {
    const key = `${this.PREFIXES.BALANCE_LOCK}${memberId}`;
    const result = await redisService.del(key);
    return result > 0;
  }

  /**
   * 清除所有缓存
   */
  static async clearAllCache(): Promise<boolean> {
    return await redisService.flushdb();
  }

  /**
   * 检查 Redis 连接状态
   */
  static isConnected(): boolean {
    return redisService.getConnectionStatus();
  }
}

export default CacheService;
