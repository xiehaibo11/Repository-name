import app from './app';
import dotenv from 'dotenv';
import { initializeDatabase } from './models';
import { developmentPortCleaner, safePortCheck, showPortManagerStatus } from './utils/portManager';
import { SSCService } from './modules/ssc/SSCService';
import { getPool, testPoolConnection } from './config/database';
// 开发环境暂时禁用 Redis
// import { redisService } from './config/redis';
// import { redisAutoStart } from './utils/redisAutoStart';

// 加载环境变量
dotenv.config();

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    console.log('🔄 开始启动后端管理系统...\n');

    // 显示端口管理器状态
    showPortManagerStatus();

    // 🚨 开发环境端口检查和清理
    const isDevelopment = process.env.NODE_ENV === 'development';
    const devKillerEnabled = process.env.ENABLE_DEV_PORT_KILLER === 'true';

    let portAvailable = false;

    if (isDevelopment && devKillerEnabled) {
      console.log('⚠️  开发模式：启用端口自动清理功能');
      portAvailable = await developmentPortCleaner(Number(PORT));
    } else {
      console.log('🔒 生产模式：使用安全端口检查');
      portAvailable = await safePortCheck(Number(PORT));
    }

    if (!portAvailable) {
      console.error(`❌ 端口 ${PORT} 不可用，服务器启动失败`);
      process.exit(1);
    }

    // 先初始化数据库
    console.log('🔄 开始初始化数据库...');
    await initializeDatabase();

    // 自动启动和连接 Redis - 开发环境暂时禁用
    // console.log('🔄 开始连接 Redis...');
    // try {
    //   // 检查环境变量是否启用 Redis 自动启动
    //   const autoStartEnabled = process.env.REDIS_AUTO_START !== 'false';

    //   if (autoStartEnabled) {
    //     // 尝试自动启动 Redis
    //     await redisAutoStart.autoStart();
    //   }

    //   // 连接 Redis
    //   await redisService.connect();
    //   console.log('✅ Redis 连接成功');
    // } catch (error) {
    //   console.warn('⚠️  Redis 连接失败，应用将在无缓存模式下运行:', error);
    // }

    // 然后启动服务器
    const server = app.listen(PORT, async () => {
      console.log(`\n🚀 后端管理系统启动成功`);
      console.log(`📍 服务地址: http://localhost:${PORT}`);
      console.log(`📋 API文档: http://localhost:${PORT}/api`);
      console.log(`🔧 健康检查: http://localhost:${PORT}/health`);

      // 再次显示安全警告
      if (isDevelopment && devKillerEnabled) {
        console.log(`\n🚨 警告: 开发端口清理功能已启用`);
        console.log(`   请在生产部署前禁用此功能！`);
      }

      // 启动分分时时彩系统
      try {
        console.log(`\n🎲 正在启动分分时时彩系统...`);

        // 测试数据库连接池
        const poolConnected = await testPoolConnection();
        if (!poolConnected) {
          throw new Error('数据库连接池测试失败');
        }

        // 获取数据库连接池并启动SSC服务
        const pool = getPool();
        const sscService = SSCService.getInstance(pool);
        await sscService.startSystem();

        console.log(`✅ 分分时时彩系统启动成功`);
        console.log(`🔄 自动开奖功能已启用，每分钟准点开奖`);
        console.log(`📊 系统特性: 实时倒计时、自动结算、24小时运行`);
      } catch (error) {
        console.error(`❌ 分分时时彩系统启动失败:`, error);
        console.log(`⚠️  系统将继续运行，但SSC功能不可用`);
      }
    });

    // 处理服务器错误
    server.on('error', (error) => {
      console.error('❌ 服务器错误:', error);
    });

    // 优雅关闭
    process.on('SIGTERM', async () => {
      console.log('🔄 收到SIGTERM信号，正在关闭服务器...');
      // 开发环境暂时禁用 Redis
      // await redisService.disconnect();
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

    process.on('SIGINT', async () => {
      console.log('🔄 收到SIGINT信号，正在关闭服务器...');
      // 开发环境暂时禁用 Redis
      // await redisService.disconnect();
      server.close(() => {
        console.log('✅ 服务器已关闭');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ 服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理未捕获的异常
process.on('uncaughtException', (error) => {
  console.error('❌ 未捕获的异常:', error);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ 未处理的Promise rejection:', reason);
  process.exit(1);
});

startServer();