/**
 * 交易路由
 * 定义交易相关的API路由
 */

const express = require('express');
const Joi = require('joi');
const transactionController = require('../controllers/transactionController');
const { authenticateToken, requireAdmin, requireAgent, requireMember, requireAdminOrAgent } = require('../middleware/auth');
const { validateBody, validateParams, validateQuery, transactionSchemas, commonSchemas } = require('../middleware/validation');
const { apiLimiter, strictLimiter } = require('../middleware/security');

const router = express.Router();

// 所有路由都需要认证
router.use(authenticateToken);
router.use(apiLimiter);

// 会员专用路由

/**
 * @route   POST /api/transactions/deposit
 * @desc    会员充值
 * @access  Private (Member only)
 */
router.post('/deposit', 
  requireMember,
  validateBody(transactionSchemas.deposit),
  transactionController.deposit
);

/**
 * @route   POST /api/transactions/withdraw
 * @desc    会员提现
 * @access  Private (Member only)
 */
router.post('/withdraw', 
  requireMember,
  validateBody(transactionSchemas.withdraw),
  transactionController.withdraw
);

/**
 * @route   GET /api/transactions/my
 * @desc    获取当前用户交易记录
 * @access  Private
 */
router.get('/my', 
  validateQuery(transactionSchemas.getTransactions),
  transactionController.getCurrentUserTransactions
);

// 管理员专用路由

/**
 * @route   GET /api/transactions
 * @desc    获取所有交易记录
 * @access  Private (Admin only)
 */
router.get('/', 
  requireAdmin,
  validateQuery(transactionSchemas.getTransactions),
  transactionController.getAllTransactions
);

/**
 * @route   GET /api/transactions/stats
 * @desc    获取交易统计
 * @access  Private (Admin or Agent)
 */
router.get('/stats', 
  requireAdminOrAgent,
  validateQuery(transactionSchemas.getTransactionStats),
  transactionController.getTransactionStats
);

/**
 * @route   GET /api/transactions/export
 * @desc    导出交易记录
 * @access  Private (Admin or Agent)
 */
router.get('/export', 
  requireAdminOrAgent,
  strictLimiter,
  validateQuery(transactionSchemas.exportTransactions),
  transactionController.exportTransactions
);

// 代理专用路由

/**
 * @route   GET /api/transactions/members
 * @desc    获取代理下级会员交易记录
 * @access  Private (Agent only)
 */
router.get('/members', 
  requireAgent,
  validateQuery(transactionSchemas.getTransactions),
  transactionController.getAgentMemberTransactions
);

// 管理员和代理共用路由

/**
 * @route   GET /api/transactions/:id
 * @desc    获取交易详情
 * @access  Private (Admin or Agent)
 */
router.get('/:id', 
  requireAdminOrAgent,
  validateParams(Joi.object({ id: commonSchemas.id })),
  transactionController.getTransactionById
);

/**
 * @route   PATCH /api/transactions/:id/status
 * @desc    更新交易状态
 * @access  Private (Admin only)
 */
router.patch('/:id/status', 
  requireAdmin,
  strictLimiter,
  validateParams(Joi.object({ id: commonSchemas.id })),
  validateBody(transactionSchemas.updateTransactionStatus),
  transactionController.updateTransactionStatus
);

module.exports = router;