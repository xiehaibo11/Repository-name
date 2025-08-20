/**
 * 投注路由
 * 定义投注相关的API路由
 */

const express = require('express');
const Joi = require('joi');
const betController = require('../controllers/betController');
const { authenticateToken, requireAdmin, requireAgent, requireMember, requireAdminOrAgent } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery, betSchemas, commonSchemas } = require('../middleware/validation');
const { apiLimiter, strictLimiter, bettingLimiter } = require('../middleware/security');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);
router.use(apiLimiter);

// 会员专用路由

/**
 * @route   POST /api/bets
 * @desc    创建投注
 * @access  Private (Member only)
 */
router.post('/', 
  requireMember,
  bettingLimiter,
  validateBody(betSchemas.createBet),
  betController.createBet
);

/**
 * @route   GET /api/bets/my
 * @desc    获取当前用户投注记录
 * @access  Private
 */
router.get('/my', 
  validateQuery(betSchemas.getBets),
  betController.getCurrentUserBets
);

/**
 * @route   DELETE /api/bets/:id
 * @desc    取消投注
 * @access  Private (Member only)
 */
router.delete('/:id', 
  requireMember,
  validateParams(Joi.object({ id: commonSchemas.id })),
  betController.cancelBet
);

// 管理员专用路由

/**
 * @route   GET /api/bets
 * @desc    获取所有投注记录
 * @access  Private (Admin only)
 */
router.get('/', 
  requireAdmin,
  validateQuery(betSchemas.getBets),
  betController.getAllBets
);

/**
 * @route   POST /api/bets/:id/settle
 * @desc    结算投注
 * @access  Private (Admin only)
 */
router.post('/:id/settle', 
  requireAdmin,
  strictLimiter,
  validateParams(Joi.object({ id: commonSchemas.id })),
  validateBody(betSchemas.settleBet),
  betController.settleBet
);

/**
 * @route   GET /api/bets/stats
 * @desc    获取投注统计
 * @access  Private (Admin or Agent)
 */
router.get('/stats', 
  requireAdminOrAgent,
  validateQuery(betSchemas.getBetStats),
  betController.getBetStats
);

/**
 * @route   GET /api/bets/game-stats
 * @desc    获取游戏类型投注统计
 * @access  Private (Admin or Agent)
 */
router.get('/game-stats', 
  requireAdminOrAgent,
  validateQuery(betSchemas.getGameStats),
  betController.getGameTypeBetStats
);

/**
 * @route   GET /api/bets/export
 * @desc    导出投注记录
 * @access  Private (Admin or Agent)
 */
router.get('/export', 
  requireAdminOrAgent,
  strictLimiter,
  validateQuery(betSchemas.exportBets),
  betController.exportBets
);

// 代理专用路由

/**
 * @route   GET /api/bets/members
 * @desc    获取代理下级会员投注记录
 * @access  Private (Agent only)
 */
router.get('/members', 
  requireAgent,
  validateQuery(betSchemas.getBets),
  betController.getAgentMemberBets
);

// 管理员和代理共用路由

/**
 * @route   GET /api/bets/:id
 * @desc    获取投注详情
 * @access  Private (Admin or Agent)
 */
router.get('/:id', 
  requireAdminOrAgent,
  validateParams(Joi.object({ id: commonSchemas.id })),
  betController.getBetById
);

module.exports = router;