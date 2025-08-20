import Redis, { RedisOptions } from 'ioredis';

export interface RedisConfig {
  host: string;
  port: number;
  password?: string;
  db: number;
  keyPrefix: string;
}

export class RedisService {
  private client: Redis | null = null;
  private subscriber: Redis | null = null;
  private config: RedisConfig;
  private isConnected: boolean = false;

  constructor() {
    this.config = {
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '123456',
      db: parseInt(process.env.REDIS_DB || '0'),
      keyPrefix: process.env.REDIS_KEY_PREFIX || 'admin_api:'
    };
  }

  /**
   * 获取Redis配置选项
   */
  private getRedisOptions(): RedisOptions {
    return {
      host: this.config.host,
      port: this.config.port,
      password: this.config.password,
      db: this.config.db,
      keyPrefix: this.config.keyPrefix,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      lazyConnect: true,
      connectTimeout: 10000,
      commandTimeout: 5000,
      // 连接池配置
      family: 4,
      keepAlive: 30000,
      // 重连策略
      reconnectOnError: (err) => {
        const targetError = 'READONLY';
        return err.message.includes(targetError);
      }
    };
  }

  /**
   * 连接Redis
   */
  async connect(): Promise<void> {
    try {
      if (this.client) {
        await this.disconnect();
      }

      // 创建主连接
      this.client = new Redis(this.getRedisOptions());

      // 设置事件监听器
      this.setupEventListeners(this.client, 'Main');

      // 等待连接就绪
      await this.waitForConnection();

      this.isConnected = true;
      console.log('✅ Redis 连接成功');
    } catch (error) {
      console.error('❌ Redis 连接失败:', error);
      this.isConnected = false;
      // 不抛出错误，允许应用在没有 Redis 的情况下运行
    }
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(client: Redis, name: string): void {
    client.on('connect', () => {
      console.log(`Redis ${name} Client Connected`);
    });

    client.on('ready', () => {
      console.log(`Redis ${name} Client Ready`);
      this.isConnected = true;
    });

    client.on('error', (err: Error) => {
      // 静默处理常见的连接错误
      if (err.message.includes('ECONNRESET') ||
          err.message.includes('ENOTFOUND') ||
          err.message.includes('ETIMEDOUT')) {
        // 静默处理，这些是正常的网络波动
      } else {
        console.error(`Redis ${name} Client Error:`, err.message);
      }
      this.isConnected = false;
    });

    client.on('close', () => {
      console.log(`Redis ${name} Client Disconnected`);
      this.isConnected = false;
    });

    client.on('reconnecting', (ms: number) => {
      console.log(`Redis ${name} Client Reconnecting in ${ms}ms...`);
    });

    client.on('end', () => {
      console.log(`Redis ${name} Client Connection Ended`);
      this.isConnected = false;
    });
  }

  /**
   * 等待连接就绪
   */
  private async waitForConnection(): Promise<void> {
    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Redis connection timeout'));
      }, 10000);

      if (this.client!.status === 'ready') {
        clearTimeout(timeout);
        resolve();
        return;
      }

      this.client!.once('ready', () => {
        clearTimeout(timeout);
        resolve();
      });

      this.client!.once('error', (err) => {
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  /**
   * 断开连接
   */
  async disconnect(): Promise<void> {
    try {
      if (this.subscriber) {
        await this.subscriber.disconnect();
        this.subscriber = null;
      }

      if (this.client) {
        await this.client.disconnect();
        this.client = null;
      }

      this.isConnected = false;
      console.log('Redis 连接已断开');
    } catch (error) {
      console.error('Redis 断开连接失败:', error);
    }
  }

  /**
   * 获取完整的键名（带前缀）
   */
  private getKey(key: string): string {
    return key; // ioredis 会自动处理 keyPrefix
  }

  /**
   * 设置键值
   */
  async set(key: string, value: string | number | Buffer, ttl?: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return false;
    }

    try {
      if (ttl) {
        await this.client.setex(key, ttl, value);
      } else {
        await this.client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error);
      return false;
    }
  }

  /**
   * 获取键值
   */
  async get(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    try {
      return await this.client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error);
      return null;
    }
  }

  /**
   * 删除键
   */
  async del(key: string | string[]): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return 0;
    }

    try {
      if (Array.isArray(key)) {
        return await this.client.del(...key);
      } else {
        return await this.client.del(key);
      }
    } catch (error) {
      console.error('Redis DEL error:', error);
      return 0;
    }
  }

  /**
   * 检查键是否存在
   */
  async exists(key: string | string[]): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return 0;
    }

    try {
      if (Array.isArray(key)) {
        return await this.client.exists(...key);
      } else {
        return await this.client.exists(key);
      }
    } catch (error) {
      console.error('Redis EXISTS error:', error);
      return 0;
    }
  }

  /**
   * 设置键的过期时间
   */
  async expire(key: string, ttl: number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return false;
    }

    try {
      const result = await this.client.expire(key, ttl);
      return result === 1;
    } catch (error) {
      console.error('Redis EXPIRE error:', error);
      return false;
    }
  }

  /**
   * 获取匹配模式的键
   */
  async keys(pattern: string): Promise<string[]> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return [];
    }

    try {
      return await this.client.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS error:', error);
      return [];
    }
  }

  /**
   * 清空当前数据库
   */
  async flushdb(): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return false;
    }

    try {
      await this.client.flushdb();
      return true;
    } catch (error) {
      console.error('Redis FLUSHDB error:', error);
      return false;
    }
  }

  /**
   * 哈希操作 - 设置哈希字段
   */
  async hset(key: string, field: string, value: string | number): Promise<boolean> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return false;
    }

    try {
      await this.client.hset(key, field, value);
      return true;
    } catch (error) {
      console.error('Redis HSET error:', error);
      return false;
    }
  }

  /**
   * 哈希操作 - 获取哈希字段
   */
  async hget(key: string, field: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    try {
      return await this.client.hget(key, field);
    } catch (error) {
      console.error('Redis HGET error:', error);
      return null;
    }
  }

  /**
   * 哈希操作 - 获取所有哈希字段
   */
  async hgetall(key: string): Promise<Record<string, string>> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return {};
    }

    try {
      return await this.client.hgetall(key);
    } catch (error) {
      console.error('Redis HGETALL error:', error);
      return {};
    }
  }

  /**
   * 列表操作 - 左推入
   */
  async lpush(key: string, ...values: (string | number)[]): Promise<number> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return 0;
    }

    try {
      return await this.client.lpush(key, ...values);
    } catch (error) {
      console.error('Redis LPUSH error:', error);
      return 0;
    }
  }

  /**
   * 列表操作 - 右弹出
   */
  async rpop(key: string): Promise<string | null> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    try {
      return await this.client.rpop(key);
    } catch (error) {
      console.error('Redis RPOP error:', error);
      return null;
    }
  }

  /**
   * 获取连接状态
   */
  getConnectionStatus(): boolean {
    return this.isConnected && this.client?.status === 'ready';
  }

  /**
   * 获取客户端实例
   */
  getClient(): Redis | null {
    return this.client;
  }

  /**
   * 创建订阅客户端
   */
  async createSubscriber(): Promise<Redis | null> {
    if (!this.isConnected) {
      console.warn('Main Redis client not connected');
      return null;
    }

    try {
      this.subscriber = new Redis(this.getRedisOptions());
      this.setupEventListeners(this.subscriber, 'Subscriber');
      return this.subscriber;
    } catch (error) {
      console.error('Failed to create Redis subscriber:', error);
      return null;
    }
  }

  /**
   * 执行Lua脚本
   */
  async eval(script: string, keys: string[], args: (string | number)[]): Promise<any> {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    try {
      return await this.client.eval(script, keys.length, ...keys, ...args);
    } catch (error) {
      console.error('Redis EVAL error:', error);
      return null;
    }
  }

  /**
   * 管道操作
   */
  pipeline(): any {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    return this.client.pipeline();
  }

  /**
   * 事务操作
   */
  multi(): any {
    if (!this.client || !this.isConnected) {
      console.warn('Redis client not connected');
      return null;
    }

    return this.client.multi();
  }
}

// 创建单例实例
export const redisService = new RedisService();

// 导出默认实例
export default redisService;
