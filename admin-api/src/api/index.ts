import { Router } from 'express';
import agentRoutes from './agent';
import memberRoutes from './member';
import dashboardRoutes from './dashboard';

const router = Router();

// 管理员相关API已移至主路由

// 仪表盘API
router.use('/admin/dashboard', dashboardRoutes);

// 代理商管理API
router.use('/admin/agents', agentRoutes);

// 会员管理API
router.use('/admin/members', memberRoutes);

export default router;
