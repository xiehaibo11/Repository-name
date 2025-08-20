import { Router } from 'express';
import { unifiedLogin, checkUserStatus, analyzeIPLocation } from '../controllers/unifiedAuthController';

const router = Router();

// 统一登录接口
router.post('/login', unifiedLogin);

// 检查用户状态接口
router.post('/check-status', checkUserStatus);

// IP地理位置解析接口（测试用）
router.get('/analyze-ip', analyzeIPLocation);

export default router;
