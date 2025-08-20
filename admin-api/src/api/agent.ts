import { Router } from 'express';
import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { Op } from 'sequelize';
import { Agent, CreditLog, Member } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route GET /agents
 * @desc 获取代理商列表
 * @access Private
 */
router.get('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      search,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // 状态过滤
    if (status) {
      whereClause.status = status;
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

    const { count, rows: agents } = await Agent.findAndCountAll({
      where: whereClause,
      attributes: { exclude: ['password'] },
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      status: 'success',
      message: '获取代理商列表成功',
      data: {
        agents,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取代理商列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route POST /agents
 * @desc 创建代理商
 * @access Private
 */
router.post('/', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { username, nickname, password, credit = 0 } = req.body;

    if (!username || !nickname || !password) {
      return res.status(400).json({
        status: 'error',
        message: '用户名、昵称和密码不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
    }

    // 检查用户名是否已存在
    const existingAgent = await Agent.findOne({ where: { username } });
    if (existingAgent) {
      return res.status(400).json({
        status: 'error',
        message: '用户名已存在',
        code: 'USERNAME_EXISTS'
      });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建代理商
    const agent = await Agent.create({
      username,
      nickname,
      password: hashedPassword,
      credit: Number(credit),
      status: 'active'
    });

    // 如果设置了初始信用额度，记录日志
    if (Number(credit) > 0) {
      await CreditLog.create({
        userId: agent.id,
        userType: 'agent',
        amount: Number(credit),
        previousAmount: 0,
        newAmount: Number(credit),
        type: 'admin',
        reason: '创建代理商时设置初始信用额度',
        operatorId: (req as any).user.id
      });
    }

    res.status(201).json({
      status: 'success',
      message: '代理商创建成功',
      data: {
        agent: {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname,
          credit: agent.credit,
          status: agent.status,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('创建代理商错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route PUT /agents/:id
 * @desc 更新代理商信息
 * @access Private
 */
router.put('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { nickname, status } = req.body;

    const agent = await Agent.findByPk(id);
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
    }

    // 更新代理商信息
    await agent.update({
      nickname: nickname || agent.nickname,
      status: status || agent.status
    });

    res.json({
      status: 'success',
      message: '代理商信息更新成功',
      data: {
        agent: {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname,
          credit: agent.credit,
          status: agent.status,
          createdAt: agent.createdAt,
          updatedAt: agent.updatedAt
        }
      }
    });
  } catch (error) {
    console.error('更新代理商信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route DELETE /agents/:id
 * @desc 删除代理商
 * @access Private
 */
router.delete('/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const agent = await Agent.findByPk(id);
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
    }

    // 检查是否有关联的会员
    const memberCount = await Member.count({ where: { agentId: id } });
    if (memberCount > 0) {
      return res.status(400).json({
        status: 'error',
        message: '该代理商下还有会员，无法删除',
        code: 'AGENT_HAS_MEMBERS'
      });
    }

    await agent.destroy();

    res.json({
      status: 'success',
      message: '代理商删除成功'
    });
  } catch (error) {
    console.error('删除代理商错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route PATCH /agents/:id/credit
 * @desc 调整代理商信用额度
 * @access Private
 */
router.patch('/:id/credit', authenticateToken, async (req: Request, res: Response) => {
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

    const agent = await Agent.findByPk(id);
    if (!agent) {
      return res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
    }

    const previousAmount = agent.credit;
    const newAmount = previousAmount + Number(amount);

    // 更新代理商信用额度
    await agent.update({ credit: newAmount });

    // 记录信用额度变更日志
    await CreditLog.create({
      userId: agent.id,
      userType: 'agent',
      amount: Number(amount),
      previousAmount,
      newAmount,
      type: 'adjustment',
      reason,
      operatorId: (req as any).user.id
    });

    res.json({
      status: 'success',
      message: '信用额度调整成功',
      data: {
        agent: {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname,
          credit: newAmount,
          status: agent.status
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
    console.error('调整代理商信用额度错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

/**
 * @route GET /agents/credit-logs
 * @desc 获取信用额度变更日志
 * @access Private
 */
router.get('/credit-logs', authenticateToken, async (req: Request, res: Response) => {
  try {
    const {
      page = 1,
      limit = 20,
      agentId,
      type,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // 代理商过滤
    if (agentId) {
      whereClause.userId = agentId;
    }

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

    const { count, rows: logs } = await CreditLog.findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Agent,
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
      message: '获取信用额度日志成功',
      data: {
        logs,
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取信用额度日志错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
