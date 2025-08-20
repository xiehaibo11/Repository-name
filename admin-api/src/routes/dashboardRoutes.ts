import { Router } from 'express';
import {
  getStats,
  getCharts,
  getActivities
} from '../controllers/dashboardController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取摘要统计信息
router.get('/stats', getStats);

// 获取图表数据
router.get('/charts', getCharts);

// 获取系统活动日志
router.get('/activities', getActivities);

export default router;
