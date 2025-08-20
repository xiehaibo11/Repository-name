import { Router } from 'express';
import {
  getMembers,
  createMember,
  updateMember,
  deleteMember,
  adjustMemberBalance,
  getMemberTransactions,
  getMemberBets,
  getBalanceLogs
} from '../controllers/memberController';
import { authenticateToken, requireAdmin } from '../middleware/auth';

const router = Router();

// 所有路由都需要认证和管理员权限
router.use(authenticateToken);
router.use(requireAdmin);

// 获取会员列表
router.get('/', getMembers);

// 创建会员
router.post('/', createMember);

// 更新会员信息
router.put('/:id', updateMember);

// 删除会员
router.delete('/:id', deleteMember);

// 调整会员余额
router.patch('/:id/balance', adjustMemberBalance);

// 获取余额变更日志
router.get('/balance-logs', getBalanceLogs);

// 查看会员交易记录
router.get('/:id/transactions', getMemberTransactions);

// 查看会员投注记录
router.get('/:id/bets', getMemberBets);

export default router;
