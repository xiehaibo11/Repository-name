import { Router } from 'express';
import { authenticateAgent, requireAgentBackend } from '../middleware/auth';
import { getAgentDashboard, getAgentMembers, getAgentCreditLogs } from '../controllers/agentBackendController';

const router = Router();

// 所有路由都需要代理商认证和后台权限
router.use(authenticateAgent);
router.use(requireAgentBackend);

// 代理商仪表盘
router.get('/dashboard', getAgentDashboard);

// 代理商的会员列表
router.get('/members', getAgentMembers);

// 代理商的信用额度日志
router.get('/credit-logs', getAgentCreditLogs);

export default router;
