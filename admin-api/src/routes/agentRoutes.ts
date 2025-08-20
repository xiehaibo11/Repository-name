import { Router } from 'express';
import {
  getAgents,
  createAgent,
  updateAgent,
  deleteAgent,
  adjustAgentCredit,
  getCreditLogs
} from '../controllers/agentController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取代理商列表
router.get('/', getAgents);

// 创建代理商
router.post('/', createAgent);

// 更新代理商信息
router.put('/:id', updateAgent);

// 删除代理商
router.delete('/:id', deleteAgent);

// 调整代理商信用额度
router.patch('/:id/credit', adjustAgentCredit);

// 获取信用额度变更日志
router.get('/credit-logs', getCreditLogs);

export default router;
