import { Router } from 'express';
import {
  getCurrentBets,
  getBetHistory,
  getBetStatistics,
  getBigBetMonitoring,
  getMemberBetAnalysis
} from '../controllers/betController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有投注数据路由都需要管理员认证
router.use(authenticateToken);
router.use(requireAdmin);

// 投注数据路由
router.get('/current', getCurrentBets);           // 获取当前投注数据
router.get('/history', getBetHistory);           // 获取投注历史
router.get('/statistics', getBetStatistics);     // 获取投注统计
router.get('/big-bets', getBigBetMonitoring);       // 获取大额投注监控
router.get('/member-analysis', getMemberBetAnalysis); // 获取会员投注分析

export default router;
