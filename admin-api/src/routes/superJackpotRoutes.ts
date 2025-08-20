import { Router } from 'express';
import {
  getSuperJackpotStatus,
  getSuperJackpotWinners,
  getSuperJackpotLogs,
  updateSuperJackpotConfig,
  payoutSuperJackpot,
  manualTriggerSuperJackpot,
  getSuperJackpotReport
} from '../controllers/superJackpotController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有超级大奖路由都需要管理员认证
router.use(authenticateToken);
router.use(requireAdmin);

/**
 * @route   GET /api/super-jackpot/status
 * @desc    获取超级大奖系统状态
 * @access  Private (Admin only)
 */
router.get('/status', getSuperJackpotStatus);

/**
 * @route   GET /api/super-jackpot/winners
 * @desc    获取超级大奖中奖记录
 * @access  Private (Admin only)
 * @query   page, pageSize, status
 */
router.get('/winners', getSuperJackpotWinners);

/**
 * @route   GET /api/super-jackpot/logs
 * @desc    获取超级大奖日志
 * @access  Private (Admin only)
 * @query   page, pageSize, event_type, is_triggered
 */
router.get('/logs', getSuperJackpotLogs);

/**
 * @route   POST /api/super-jackpot/config
 * @desc    更新超级大奖配置
 * @access  Private (Admin only)
 * @body    base_probability, bet_volume_multiplier, jackpot_multiplier, etc.
 */
router.post('/config', updateSuperJackpotConfig);

/**
 * @route   POST /api/super-jackpot/payout/:winnerId
 * @desc    支付超级大奖
 * @access  Private (Admin only)
 * @params  winnerId
 */
router.post('/payout/:winnerId', payoutSuperJackpot);

/**
 * @route   POST /api/super-jackpot/manual-trigger
 * @desc    手动触发超级大奖（测试用）
 * @access  Private (Admin only)
 * @body    issueId, userId, testMode
 */
router.post('/manual-trigger', manualTriggerSuperJackpot);

/**
 * @route   GET /api/super-jackpot/report
 * @desc    获取超级大奖统计报表
 * @access  Private (Admin only)
 * @query   startDate, endDate
 */
router.get('/report', getSuperJackpotReport);

export default router;
