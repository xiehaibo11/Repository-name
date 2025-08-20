/**
 * 分分时时彩路由配置
 * 定义所有SSC相关的API路由
 */

import { Router } from 'express';
import { Pool } from 'pg';
import { SSCController } from '../controllers/sscController';

/**
 * 创建SSC路由
 * @param pool 数据库连接池
 */
export function createSSCRoutes(pool: Pool): Router {
  const router = Router();
  const sscController = new SSCController(pool);

  // ==================== 系统管理接口 ====================
  
  /**
   * 启动SSC系统
   * POST /api/ssc/start
   */
  router.post('/start', sscController.startSystem);

  /**
   * 停止SSC系统
   * POST /api/ssc/stop
   */
  router.post('/stop', sscController.stopSystem);

  /**
   * 获取系统状态
   * GET /api/ssc/status
   */
  router.get('/status', sscController.getSystemStatus);

  /**
   * 健康检查
   * GET /api/ssc/health
   */
  router.get('/health', sscController.healthCheck);

  /**
   * 获取实时数据 - 合并系统状态和倒计时
   * GET /api/ssc/realtime
   */
  router.get('/realtime', sscController.getRealtimeData);

  // ==================== 开奖相关接口 ====================

  /**
   * 获取当前倒计时
   * GET /api/ssc/countdown
   */
  router.get('/countdown', sscController.getCurrentCountdown);

  /**
   * 手动开奖
   * POST /api/ssc/manual-draw
   * Body: { issueNo: string, numbers?: number[], operatorId?: number }
   */
  router.post('/manual-draw', sscController.manualDraw);

  /**
   * 获取最新开奖结果
   * GET /api/ssc/latest-result
   */
  router.get('/latest-result', sscController.getLatestResult);

  /**
   * 获取历史开奖记录
   * GET /api/ssc/history?page=1&limit=20&date=2025-07-28
   */
  router.get('/history', sscController.getHistoryResults);

  // ==================== 配置相关接口 ====================

  /**
   * 获取赔率配置
   * GET /api/ssc/odds
   */
  router.get('/odds', sscController.getOddsConfig);

  // ==================== 投注相关接口 ====================
  // TODO: 后续实现投注相关接口
  
  /**
   * 提交投注
   * POST /api/ssc/bet
   * Body: { issueNo: string, bets: BetItemRequest[] }
   */
  // router.post('/bet', sscController.submitBet);

  /**
   * 获取投注记录
   * GET /api/ssc/my-bets?page=1&limit=20&status=all
   */
  // router.get('/my-bets', sscController.getMyBets);

  /**
   * 计算预期收益
   * POST /api/ssc/calculate-win
   * Body: { bets: BetItemRequest[] }
   */
  // router.post('/calculate-win', sscController.calculateWin);

  // ==================== 统计相关接口 ====================
  // TODO: 后续实现统计相关接口

  /**
   * 获取投注统计
   * GET /api/ssc/bet-statistics?date=2025-07-28
   */
  // router.get('/bet-statistics', sscController.getBetStatistics);

  /**
   * 获取中奖统计
   * GET /api/ssc/win-statistics?date=2025-07-28
   */
  // router.get('/win-statistics', sscController.getWinStatistics);

  /**
   * 获取用户统计
   * GET /api/ssc/user-statistics?userId=123
   */
  // router.get('/user-statistics', sscController.getUserStatistics);

  return router;
}

/**
 * SSC路由中间件
 * 用于添加通用的请求处理逻辑
 */
export function sscMiddleware() {
  return (req: any, res: any, next: any) => {
    // 添加请求日志
    console.log(`📡 SSC API请求: ${req.method} ${req.path}`, {
      query: req.query,
      body: req.method !== 'GET' ? req.body : undefined,
      timestamp: new Date().toISOString()
    });
    
    // 设置响应头
    res.header('X-SSC-API-Version', '1.0.0');
    res.header('X-SSC-Timestamp', new Date().toISOString());
    
    next();
  };
}
