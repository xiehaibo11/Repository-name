import { Router } from 'express';
import {
  getUserLoginHistory,
  getIpLoginHistory,
  getUserLoginStats,
  getCurrentUserSecurityInfo,
  checkSuspiciousActivity,
  getLoginLogs
} from '../controllers/loginLogController';
import { authenticateToken, requireAdmin, authenticateMember, authenticateAgent } from '../middleware/auth';

const router = Router();

// 公共路由（需要认证）

/**
 * @route   GET /api/login-logs/security-info
 * @desc    获取当前用户的安全信息（最后登录信息）
 * @access  Private (Member/Agent/Admin)
 */
router.get('/security-info', authenticateToken, getCurrentUserSecurityInfo);

// 会员专用路由

/**
 * @route   GET /api/login-logs/member/history/:userId
 * @desc    获取会员登录历史
 * @access  Private (Member - 只能查看自己的)
 */
router.get('/member/history/:userId', authenticateMember, getUserLoginHistory);

/**
 * @route   GET /api/login-logs/member/stats/:userId
 * @desc    获取会员登录统计
 * @access  Private (Member - 只能查看自己的)
 */
router.get('/member/stats/:userId', authenticateMember, getUserLoginStats);

// 代理商专用路由

/**
 * @route   GET /api/login-logs/agent/history/:userId
 * @desc    获取代理商登录历史
 * @access  Private (Agent - 只能查看自己的)
 */
router.get('/agent/history/:userId', authenticateAgent, getUserLoginHistory);

/**
 * @route   GET /api/login-logs/agent/stats/:userId
 * @desc    获取代理商登录统计
 * @access  Private (Agent - 只能查看自己的)
 */
router.get('/agent/stats/:userId', authenticateAgent, getUserLoginStats);

// 管理员专用路由

/**
 * @route   GET /api/login-logs/admin
 * @desc    获取所有登录日志（管理员）
 * @access  Private (Admin only)
 */
router.get('/admin', authenticateToken, requireAdmin, getLoginLogs);

/**
 * @route   GET /api/login-logs/admin/user/:userType/:userId/history
 * @desc    获取指定用户登录历史（管理员）
 * @access  Private (Admin only)
 */
router.get('/admin/user/:userType/:userId/history', authenticateToken, requireAdmin, getUserLoginHistory);

/**
 * @route   GET /api/login-logs/admin/user/:userType/:userId/stats
 * @desc    获取指定用户登录统计（管理员）
 * @access  Private (Admin only)
 */
router.get('/admin/user/:userType/:userId/stats', authenticateToken, requireAdmin, getUserLoginStats);

/**
 * @route   GET /api/login-logs/admin/ip/:ip/history
 * @desc    获取指定IP登录历史（管理员）
 * @access  Private (Admin only)
 */
router.get('/admin/ip/:ip/history', authenticateToken, requireAdmin, getIpLoginHistory);

/**
 * @route   POST /api/login-logs/admin/check-suspicious
 * @desc    检查可疑登录活动（管理员）
 * @access  Private (Admin only)
 */
router.post('/admin/check-suspicious', authenticateToken, requireAdmin, checkSuspiciousActivity);

export default router;
