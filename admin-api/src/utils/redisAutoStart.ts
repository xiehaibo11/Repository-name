import { spawn, exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execAsync = promisify(exec);

/**
 * Redis 自动启动工具
 */
export class RedisAutoStart {
  private static instance: RedisAutoStart;
  private redisProcess: any = null;

  private constructor() {}

  public static getInstance(): RedisAutoStart {
    if (!RedisAutoStart.instance) {
      RedisAutoStart.instance = new RedisAutoStart();
    }
    return RedisAutoStart.instance;
  }

  /**
   * 检查 Redis 是否运行
   */
  async isRedisRunning(): Promise<boolean> {
    try {
      const password = process.env.REDIS_PASSWORD || '123456';
      const { stdout } = await execAsync(`redis-cli -a ${password} ping`, { timeout: 3000 });
      return stdout.trim() === 'PONG';
    } catch (error) {
      return false;
    }
  }

  /**
   * 启动 Redis 服务器
   */
  async startRedis(): Promise<boolean> {
    return new Promise((resolve) => {
      console.log('📦 正在启动 Redis 服务器...');
      
      // Redis 配置文件路径
      const configPath = path.join(process.cwd(), 'redis-dev.conf');
      
      try {
        this.redisProcess = spawn('redis-server', [configPath], {
          stdio: ['ignore', 'pipe', 'pipe'],
          detached: false
        });

        let started = false;
        const timeout = setTimeout(() => {
          if (!started) {
            console.log('⚠️  Redis 启动超时，但继续运行...');
            started = true;
            resolve(false);
          }
        }, 10000);

        this.redisProcess.stdout?.on('data', (data: Buffer) => {
          const output = data.toString();
          if (output.includes('ready to accept connections') && !started) {
            started = true;
            clearTimeout(timeout);
            console.log('✅ Redis 服务器启动成功');
            resolve(true);
          }
        });

        this.redisProcess.stderr?.on('data', (data: Buffer) => {
          const error = data.toString();
          if (!started && !error.includes('Warning')) {
            console.log(`⚠️  Redis 启动警告: ${error.trim()}`);
          }
        });

        this.redisProcess.on('error', (error: Error) => {
          if (!started) {
            console.log(`❌ Redis 启动失败: ${error.message}`);
            started = true;
            clearTimeout(timeout);
            resolve(false);
          }
        });

        this.redisProcess.on('exit', (code: number) => {
          if (!started) {
            console.log(`❌ Redis 进程退出，代码: ${code}`);
            started = true;
            clearTimeout(timeout);
            resolve(false);
          }
        });

      } catch (error) {
        console.log(`❌ Redis 启动失败: ${error}`);
        resolve(false);
      }
    });
  }

  /**
   * 自动检查并启动 Redis
   */
  async autoStart(): Promise<boolean> {
    try {
      // 1. 检查 Redis 是否已运行
      console.log('🔍 检查 Redis 状态...');
      const isRunning = await this.isRedisRunning();
      
      if (isRunning) {
        console.log('✅ Redis 已在运行');
        return true;
      }

      // 2. 尝试启动 Redis
      console.log('⚠️  Redis 未运行，尝试自动启动...');
      const startResult = await this.startRedis();
      
      if (startResult) {
        // 3. 验证启动结果
        await new Promise(resolve => setTimeout(resolve, 2000));
        const verifyResult = await this.isRedisRunning();
        
        if (verifyResult) {
          console.log('✅ Redis 自动启动成功');
          return true;
        } else {
          console.log('⚠️  Redis 启动后连接验证失败');
          return false;
        }
      } else {
        console.log('⚠️  Redis 自动启动失败');
        return false;
      }

    } catch (error) {
      console.log(`❌ Redis 自动启动过程中发生错误: ${error}`);
      return false;
    }
  }

  /**
   * 停止 Redis 进程（仅停止自己启动的进程）
   */
  async stopRedis(): Promise<void> {
    if (this.redisProcess && !this.redisProcess.killed) {
      try {
        console.log('📦 关闭 Redis 进程...');
        this.redisProcess.kill('SIGTERM');
        this.redisProcess = null;
      } catch (error) {
        console.log(`⚠️  关闭 Redis 进程时发生错误: ${error}`);
      }
    }
  }

  /**
   * 获取 Redis 信息
   */
  async getRedisInfo(): Promise<string | null> {
    try {
      const password = process.env.REDIS_PASSWORD || '123456';
      const { stdout } = await execAsync(`redis-cli -a ${password} info server`, { timeout: 3000 });
      return stdout;
    } catch (error) {
      return null;
    }
  }
}

// 导出单例实例
export const redisAutoStart = RedisAutoStart.getInstance();
