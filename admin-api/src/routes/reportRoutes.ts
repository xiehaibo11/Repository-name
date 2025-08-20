import { Router } from 'express';
import {
  getBusinessReport,
  getFinancialReport,
  getUserReport
} from '../controllers/reportController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取业务报表
router.get('/business', getBusinessReport);

// 获取财务报表
router.get('/financial', getFinancialReport);

// 获取用户报表
router.get('/user', getUserReport);

export default router;
