import { Router } from 'express';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Member, Agent, BalanceLog } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route GET /members
 * @desc 获取会员列表
 * @access Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      agentId,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // 状态过滤
    if (status) {
      whereClause.status = status;
    }

    // 代理商过滤
    if (agentId) {
      whereClause.agentId = agentId;
    }

    // 关键词搜索
    if (search) {
      whereClause[Op.or] = [
        { username: { [Op.iLike]: `%${search}%` } },
        { nickname: { [Op.iLike]: `%${search}%` } }
      ];
    }

    // 日期范围过滤
    if (start_date || end_date) {
      whereClause.createdAt = {};
      if (start_date) {
        whereClause.createdAt[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        whereClause.createdAt[Op.lte] = new Date(end_date as string);
      }
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      message: '获取会员列表成功',
      data: {
        members,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取会员列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route POST /members
 * @desc 创建会员
 * @access Private
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { username, nickname, password, agentId, balance = 0 } = req.body;

    if (!username || !nickname || !password || !agentId) {
      return res.status(400).json({
        status: 'error',
        message: '用户名、昵称、密码和代理商ID不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 检查用户名是否已存在
    const existingMember = await Member.findOne({ where: { username } });
    if (existingMember) {
      return res.status(400).json({
        status: 'error',
        message: '用户名已存在',
        code: 'USERNAME_EXISTS'
      });
    }

    // 检查代理商是否存在
    const agent = await Agent.findByPk(agentId);
    if (!agent) {
      return res.status(400).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建会员
    const member = await Member.create({
      username,
      nickname,
      password: hashedPassword,
      agentId: Number(agentId),
      balance: Number(balance),
      status: 'active'
    });

    // 如果设置了初始余额，记录日志
    if (Number(balance) > 0) {
      await BalanceLog.create({
        userId: member.id,
        userType: 'member',
        amount: Number(balance),
        previousAmount: 0,
        newAmount: Number(balance),
        type: 'admin',
        reason: '创建会员时设置初始余额',
        operatorId: (req as any).user.id
      });
    }

    // 重新查询会员信息，包含代理商信息
    const newMember = await Member.findByPk(member.id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    res.status(201).json({
      status: 'success',
      message: '会员创建成功',
      data: { member: newMember }
    });
  } catch (error) {
    console.error('创建会员错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route PUT /members/:id
 * @desc 更新会员信息
 * @access Private
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { username, nickname, status, agentId } = req.body;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    // 如果要更新用户名，检查新用户名是否已存在
    if (username && username !== member.username) {
      const existingMember = await Member.findOne({
        where: { username },
        attributes: ['id']
      });
      if (existingMember) {
        return res.status(400).json({
          status: 'error',
          message: '用户名已存在',
          code: 'USERNAME_EXISTS'
        });
      }
    }

    // 如果要更换代理商，检查新代理商是否存在
    if (agentId && agentId !== member.agentId) {
      const agent = await Agent.findByPk(agentId);
      if (!agent) {
        return res.status(400).json({
          status: 'error',
          message: '代理商不存在',
          code: 'AGENT_NOT_FOUND'
        });
      }
    }

    // 更新会员信息
    await member.update({
      username: username || member.username,
      nickname: nickname || member.nickname,
      status: status || member.status,
      agentId: agentId || member.agentId
    });

    // 重新查询会员信息，包含代理商信息
    const updatedMember = await Member.findByPk(id, {
      attributes: { exclude: ['password'] },
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    res.json({
      status: 'success',
      message: '会员信息更新成功',
      data: { member: updatedMember }
    });
  } catch (error) {
    console.error('更新会员信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route DELETE /members/:id
 * @desc 删除会员
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    await member.destroy();

    res.json({
      status: 'success',
      message: '会员删除成功'
    });
  } catch (error) {
    console.error('删除会员错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route PATCH /members/:id/balance
 * @desc 调整会员余额
 * @access Private
 */
router.patch('/:id/balance', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      return res.status(400).json({
        status: 'error',
        message: '调整金额和原因不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const previousAmount = member.balance;
    const newAmount = previousAmount + Number(amount);

    // 检查余额不能为负数
    if (newAmount < 0) {
      return res.status(400).json({
        status: 'error',
        message: '余额不能为负数',
        code: 'INSUFFICIENT_BALANCE'
      });
    }

    // 更新会员余额
    await member.update({ balance: newAmount });

    // 记录余额变更日志
    await BalanceLog.create({
      userId: member.id,
      userType: 'member',
      amount: Number(amount),
      previousAmount,
      newAmount,
      type: 'adjustment',
      reason,
      operatorId: (req as any).user.id
    });

    res.json({
      status: 'success',
      message: '余额调整成功',
      data: {
        member: {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          balance: newAmount,
          status: member.status
        },
        adjustment: {
          amount: Number(amount),
          previousAmount,
          newAmount,
          reason
        }
      }
    });
  } catch (error) {
    console.error('调整会员余额错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route GET /members/:id/transactions
 * @desc 获取会员交易记录
 * @access Private
 */
router.get('/:id/transactions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      start_date,
      end_date
    } = req.query;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { userId: id };

    // 类型过滤
    if (type) {
      whereClause.type = type;
    }

    // 日期范围过滤
    if (start_date || end_date) {
      whereClause.createdAt = {};
      if (start_date) {
        whereClause.createdAt[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        whereClause.createdAt[Op.lte] = new Date(end_date as string);
      }
    }

    const { count, rows: transactions } = await BalanceLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Member,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      message: '获取会员交易记录成功',
      data: {
        member: {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          balance: member.balance
        },
        transactions,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取会员交易记录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route GET /members/:id/bets
 * @desc 获取会员投注记录
 * @access Private
 */
router.get('/:id/bets', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      start_date,
      end_date
    } = req.query;

    const member = await Member.findByPk(id);
    if (!member) {
      return res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {
      userId: id,
      type: 'bet'  // 只查询投注类型的记录
    };

    // 日期范围过滤
    if (start_date || end_date) {
      whereClause.createdAt = {};
      if (start_date) {
        whereClause.createdAt[Op.gte] = new Date(start_date as string);
      }
      if (end_date) {
        whereClause.createdAt[Op.lte] = new Date(end_date as string);
      }
    }

    const { count, rows: bets } = await BalanceLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Member,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ],
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      message: '获取会员投注记录成功',
      data: {
        member: {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          balance: member.balance
        },
        bets,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取会员投注记录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
