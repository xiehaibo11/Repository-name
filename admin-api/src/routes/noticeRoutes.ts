import { Router } from 'express';
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  batchDeleteNotices,
  publishNotice,
  getPublicNotices,
  incrementViewCount,
} from '../controllers/noticeController';

const router = Router();

// 管理端路由
router.get('/admin/notices', getNotices); // 获取公告列表
router.get('/admin/notices/:id', getNoticeById); // 获取单个公告详情
router.post('/admin/notices', createNotice); // 创建公告
router.put('/admin/notices/:id', updateNotice); // 更新公告
router.delete('/admin/notices/:id', deleteNotice); // 删除公告
router.delete('/admin/notices', batchDeleteNotices); // 批量删除公告
router.patch('/admin/notices/:id/publish', publishNotice); // 发布公告

// 前端用户端路由
router.get('/public/notices', getPublicNotices); // 获取前端公告列表
router.patch('/public/notices/:id/view', incrementViewCount); // 增加查看次数

export default router;
