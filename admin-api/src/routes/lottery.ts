import express from 'express';
import {
  getLotteryTypes,
  getLotteryTypeById,
  createLotteryType,
  updateLotteryType,
  deleteLotteryType,
  getIssues,
  generateIssues,
  manualDraw,
  getDrawHistory,
  cleanupHistory,
  initLotterySystem
} from '../controllers/lotteryController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

// 应用认证中间件
router.use(authenticateToken);

// 彩种管理路由
router.get('/types', getLotteryTypes);                    // 获取彩种列表
router.get('/types/:id', getLotteryTypeById);             // 获取彩种详情
router.post('/types', createLotteryType);                 // 创建彩种
router.put('/types/:id', updateLotteryType);              // 更新彩种
router.delete('/types/:id', deleteLotteryType);           // 删除彩种

// 奖期管理路由
router.get('/issues', getIssues);                         // 获取奖期列表
router.post('/issues/generate', generateIssues);          // 批量生成奖期

// 开奖管理路由
router.post('/draw/manual', manualDraw);                  // 手动开奖
router.get('/draw/history', getDrawHistory);              // 获取开奖历史

// 系统管理路由
router.post('/cleanup/history', cleanupHistory);          // 清理历史记录
router.post('/init', initLotterySystem);                  // 初始化系统

export default router;
