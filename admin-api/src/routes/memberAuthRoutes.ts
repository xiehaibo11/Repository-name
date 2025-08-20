import { Router } from 'express';
import {
  memberLogin,
  memberLogout,
  getMemberProfile,
  getMemberBalance
} from '../controllers/memberAuthController';
import { authenticateMember } from '../middleware/auth';

const router = Router();

// 会员登录
router.post('/login', memberLogin);

// 会员登出（需要认证）
router.post('/logout', authenticateMember, memberLogout);

// 获取会员资料（需要认证）
router.get('/profile', authenticateMember, getMemberProfile);

// 获取会员余额（需要认证）
router.get('/balance', authenticateMember, getMemberBalance);

export default router;
