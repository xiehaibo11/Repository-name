import { Router } from 'express';
import { 
  agentLogin, 
  agentMemberLogin, 
  getAgentProfile, 
  agentLogout 
} from '../controllers/agentAuthController';
import { authenticateAgent } from '../middleware/auth';

const router = Router();

// 代理商后台登录
router.post('/login', agentLogin);

// 代理商前端会员登录
router.post('/member-login', agentMemberLogin);

// 代理商登出（需要认证）
router.post('/logout', authenticateAgent, agentLogout);

// 获取代理商资料（需要认证）
router.get('/profile', authenticateAgent, getAgentProfile);

export default router;
