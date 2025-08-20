import { Router } from 'express';
import { getAsyncRoutes } from '../controllers/routeController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 获取异步路由（需要认证）- 支持GET和POST
router.get('/get-async-routes', authenticateToken, getAsyncRoutes);
router.post('/get-async-routes', authenticateToken, getAsyncRoutes);

export default router;
