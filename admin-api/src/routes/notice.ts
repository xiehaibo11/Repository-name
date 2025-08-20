import { Router } from 'express';
import {
  getNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  batchDeleteNotices,
  getPublicNotices,
  publishNotice,
  incrementViewCount
} from '../controllers/noticeController';

const router = Router();

// 管理端路由
router.get('/admin/notices', getNotices);
router.get('/admin/notices/:id', getNoticeById);
router.post('/admin/notices', createNotice);
router.put('/admin/notices/:id', updateNotice);
router.delete('/admin/notices/:id', deleteNotice);
router.post('/admin/notices/batch', batchDeleteNotices); // 修正为正确的函数名
router.post('/admin/notices/:id/publish', publishNotice); // 添加发布路由
router.post('/admin/notices/:id/view', incrementViewCount); // 添加查看计数路由

// 前端用户路由
router.get('/public/notices', getPublicNotices);

export default router;
