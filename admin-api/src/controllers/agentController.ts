import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Agent, CreditLog, Member, Admin } from '../models';

// 获取代理商列表
export const getAgents = async (req: Request, res: Response): Promise<void> => {
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

    // 搜索过滤
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

    const { count, rows } = await Agent.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Member,
          as: 'members',
          attributes: ['id'],
          required: false
        }
      ]
    });

    // 计算每个代理商的会员数量
    const agentsWithMemberCount = rows.map(agent => {
      const agentData = agent.toSafeJSON();
      return {
        ...agentData,
        memberCount: (agent as any).members?.length || 0
      };
    });

    res.status(200).json({
      status: 'success',
      message: '获取代理商列表成功',
      data: {
        agents: agentsWithMemberCount,
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
};

// 创建代理商
export const createAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, nickname, password, credit = 0 } = req.body;

    // 验证必填字段
    if (!username || !nickname || !password) {
      res.status(400).json({
        status: 'error',
        message: '用户名、昵称和密码不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    // 检查用户名是否已存在
    const existingAgent = await Agent.findOne({
      where: { username }
    });

    if (existingAgent) {
      res.status(400).json({
        status: 'error',
        message: '用户名已存在',
        code: 'USERNAME_EXISTS'
      });
      return;
    }

    // 创建代理商
    const agent = await Agent.create({
      username,
      nickname,
      password,
      credit: Number(credit),
      status: 'active'
    });

    res.status(201).json({
      status: 'success',
      message: '代理商创建成功',
      data: {
        agent: agent.toSafeJSON()
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
};

// 更新代理商信息
export const updateAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { nickname, status, password } = req.body;

    const agent = await Agent.findByPk(id);
    if (!agent) {
      res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    // 更新字段
    if (nickname !== undefined) agent.nickname = nickname;
    if (status !== undefined) agent.status = status;
    if (password !== undefined) agent.password = password;

    await agent.save();

    res.status(200).json({
      status: 'success',
      message: '代理商信息更新成功',
      data: {
        agent: agent.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('更新代理商错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 删除代理商
export const deleteAgent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const agent = await Agent.findByPk(id, {
      include: [
        {
          model: Member,
          as: 'members',
          attributes: ['id']
        }
      ]
    });

    if (!agent) {
      res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    // 检查是否有关联的会员
    if ((agent as any).members && (agent as any).members.length > 0) {
      res.status(400).json({
        status: 'error',
        message: '该代理商下还有会员，无法删除',
        code: 'AGENT_HAS_MEMBERS'
      });
      return;
    }

    await agent.destroy();

    res.status(200).json({
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
};

// 调整代理商信用额度
export const adjustAgentCredit = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;

    if (!amount || !reason) {
      res.status(400).json({
        status: 'error',
        message: '调整金额和原因不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    const agent = await Agent.findByPk(id);
    if (!agent) {
      res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    // 调整信用额度
    await agent.adjustCredit(Number(amount), reason, req.admin!.id);

    res.status(200).json({
      status: 'success',
      message: '信用额度调整成功',
      data: {
        agent: agent.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('调整信用额度错误:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取信用额度变更日志
export const getCreditLogs = async (req: Request, res: Response): Promise<void> => {
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

    const { count, rows } = await CreditLog.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Agent,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        },
        {
          model: Admin,
          as: 'operator',
          attributes: ['id', 'username']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      message: '获取信用额度日志成功',
      data: {
        logs: rows,
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
};
