import { Router } from 'express';
import {
  getAvoidWinStatus,
  getAvoidWinLogs,
  getMemberBetAnalysis,
  getMemberWinRecords,
  updateAvoidWinConfig,
  getAvoidWinReport
} from '../controllers/avoidWinController';

const router = Router();

// 避开中奖路由暂时不需要认证，方便测试和管理

/**
 * @route   GET /api/admin/avoid-win/status
 * @desc    获取避开中奖系统状态
 * @access  Public (无需认证)
 */
router.get('/status', getAvoidWinStatus);

/**
 * @route   GET /api/admin/avoid-win/logs
 * @desc    获取避开中奖决策日志
 * @access  Public (无需认证)
 * @query   page, pageSize, decision_type, date_from, date_to
 */
router.get('/logs', getAvoidWinLogs);

/**
 * @route   GET /api/admin/avoid-win/analysis
 * @desc    获取会员投注分析记录
 * @access  Public (无需认证)
 * @query   page, pageSize, issue_no
 */
router.get('/analysis', getMemberBetAnalysis);

/**
 * @route   GET /api/admin/avoid-win/winners
 * @desc    获取会员中奖记录（极少数情况）
 * @access  Public (无需认证)
 * @query   page, pageSize, status, user_id
 */
router.get('/winners', getMemberWinRecords);

/**
 * @route   POST /api/admin/avoid-win/config
 * @desc    更新避开中奖系统配置
 * @access  Public (无需认证)
 * @body    allow_win_probability, system_enabled, min_bet_amount, etc.
 */
router.post('/config', updateAvoidWinConfig);

/**
 * @route   GET /api/admin/avoid-win/report
 * @desc    获取避开中奖统计报表
 * @access  Public (无需认证)
 * @query   startDate, endDate
 */
router.get('/report', getAvoidWinReport);

export default router;
