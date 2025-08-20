#!/usr/bin/env node

/**
 * 智能启动脚本 - 自动启动 Redis 和后端服务
 * 功能：
 * 1. 检查 Redis 是否已运行
 * 2. 如果未运行，自动启动 Redis
 * 3. 启动后端开发服务器
 * 4. 优雅关闭处理
 */

const { spawn, exec } = require('child_process');
const path = require('path');

console.log('🚀 启动后端管理系统（包含 Redis）...\n');

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 检查 Redis 是否运行
function checkRedisStatus() {
  return new Promise((resolve) => {
    exec('redis-cli -a 123456 ping', { timeout: 3000 }, (error, stdout) => {
      if (error || !stdout.includes('PONG')) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

// 启动 Redis
function startRedis() {
  return new Promise((resolve, reject) => {
    log('blue', '📦 正在启动 Redis 服务器...');
    
    const redisProcess = spawn('redis-server', ['redis-dev.conf'], {
      cwd: process.cwd(),
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let started = false;

    redisProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (output.includes('ready to accept connections') && !started) {
        started = true;
        log('green', '✅ Redis 服务器启动成功');
        resolve(redisProcess);
      }
    });

    redisProcess.stderr.on('data', (data) => {
      const error = data.toString();
      if (!started) {
        log('red', `❌ Redis 启动失败: ${error}`);
        reject(new Error(error));
      }
    });

    redisProcess.on('error', (error) => {
      if (!started) {
        log('red', `❌ Redis 启动失败: ${error.message}`);
        reject(error);
      }
    });

    // 超时处理
    setTimeout(() => {
      if (!started) {
        log('yellow', '⚠️  Redis 启动超时，但继续启动后端服务...');
        resolve(redisProcess);
      }
    }, 10000);
  });
}

// 启动后端服务
function startBackend() {
  return new Promise((resolve) => {
    log('blue', '🔧 正在启动后端开发服务器...');
    
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: process.cwd(),
      stdio: 'inherit',
      shell: true
    });

    backendProcess.on('error', (error) => {
      log('red', `❌ 后端服务启动失败: ${error.message}`);
    });

    resolve(backendProcess);
  });
}

// 优雅关闭处理
function setupGracefulShutdown(processes) {
  const shutdown = () => {
    log('yellow', '\n🛑 正在关闭服务...');
    
    processes.forEach((process, index) => {
      if (process && !process.killed) {
        const name = index === 0 ? 'Redis' : 'Backend';
        log('blue', `📦 关闭 ${name} 服务...`);
        
        if (process.pid) {
          try {
            process.kill('SIGTERM');
          } catch (error) {
            log('yellow', `⚠️  ${name} 服务关闭警告: ${error.message}`);
          }
        }
      }
    });

    setTimeout(() => {
      log('green', '✅ 所有服务已关闭');
      process.exit(0);
    }, 2000);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
  process.on('exit', shutdown);
}

// 主启动函数
async function main() {
  const processes = [];

  try {
    // 1. 检查 Redis 状态
    log('blue', '🔍 检查 Redis 状态...');
    const redisRunning = await checkRedisStatus();
    
    if (redisRunning) {
      log('green', '✅ Redis 已在运行');
    } else {
      log('yellow', '⚠️  Redis 未运行，正在启动...');
      const redisProcess = await startRedis();
      processes.push(redisProcess);
      
      // 等待 Redis 完全启动
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // 2. 验证 Redis 连接
    log('blue', '🔍 验证 Redis 连接...');
    const redisConnected = await checkRedisStatus();
    
    if (redisConnected) {
      log('green', '✅ Redis 连接正常');
    } else {
      log('yellow', '⚠️  Redis 连接异常，但继续启动后端服务...');
    }

    // 3. 启动后端服务
    const backendProcess = await startBackend();
    processes.push(backendProcess);

    // 4. 设置优雅关闭
    setupGracefulShutdown(processes);

    log('green', '\n🎉 启动完成！');
    log('cyan', '📍 后端服务: http://localhost:3001');
    log('cyan', '📋 API文档: http://localhost:3001/api');
    log('cyan', '🔧 健康检查: http://localhost:3001/health');
    log('magenta', '\n💡 提示: 按 Ctrl+C 可以同时关闭所有服务');

  } catch (error) {
    log('red', `❌ 启动失败: ${error.message}`);
    process.exit(1);
  }
}

// 运行主函数
main().catch((error) => {
  log('red', `❌ 启动过程中发生错误: ${error.message}`);
  process.exit(1);
});
