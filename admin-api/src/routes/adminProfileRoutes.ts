import { Router } from 'express';
import {
  getProfile,
  updateProfile,
  uploadAvatar,
  changePassword,
  deleteAvatar
} from '../controllers/adminProfileController';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { handleUploadError } from '../middleware/upload';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取管理员个人信息
router.get('/profile', getProfile);

// 更新管理员个人信息
router.put('/profile', updateProfile);

// 上传头像
router.post('/avatar', uploadAvatar, handleUploadError);

// 删除头像
router.delete('/avatar', deleteAvatar);

// 修改密码
router.put('/password', changePassword);

export default router;
