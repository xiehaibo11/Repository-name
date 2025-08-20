import express from 'express';
import {
  getLotteryGameData,
  getBetAnalysis,
  getUserDrawHistory,
  getLatestDraw,
  getCurrentIssue,
  getUserLotteryTypes
} from '../controllers/userLotteryController';

const router = express.Router();

// 用户端彩票API路由（无需认证）

// 获取彩种列表
router.get('/types', getUserLotteryTypes);

// 获取彩种游戏数据
router.get('/:lotteryCode/game-data', getLotteryGameData);

// 获取投注分析数据
router.get('/:lotteryCode/analysis', getBetAnalysis);

// 获取开奖历史
router.get('/:lotteryCode/history', getUserDrawHistory);

// 获取最新开奖结果
router.get('/:lotteryCode/latest', getLatestDraw);

// 获取当前期号信息
router.get('/:lotteryCode/current-issue', getCurrentIssue);

export default router;
