import { Router } from 'express';
import { 
  checkPublicIPSecurity, 
  checkIPSecurity, 
  batchCheckIPSecurity 
} from '../controllers/securityController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 公开路由（无需认证）
router.get('/public/security/check-ip', checkPublicIPSecurity);

// 管理员路由（需要认证）
router.get('/admin/security/check-ip', authenticateToken, requireAdmin, checkIPSecurity);
router.post('/admin/security/batch-check-ip', authenticateToken, requireAdmin, batchCheckIPSecurity);

export default router;
