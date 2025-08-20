import { Router } from 'express';
import { login, logout, getProfile, refreshToken } from '../controllers/authController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// 管理员登录
router.post('/login', login);

// 管理员登出（需要认证）
router.post('/logout', authenticateToken, logout);

// 获取管理员资料（需要认证）
router.get('/profile', authenticateToken, getProfile);

// 刷新JWT令牌
router.post('/refresh', refreshToken);

export default router;
