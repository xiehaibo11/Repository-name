import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Member, Agent, BalanceLog, Admin } from '../models';

// 获取会员列表
export const getMembers = async (req: Request, res: Response): Promise<void> => {
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

    const { count, rows } = await Member.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    const membersWithSafeData = rows.map(member => member.toSafeJSON());

    res.status(200).json({
      status: 'success',
      message: '获取会员列表成功',
      data: {
        members: membersWithSafeData,
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
};

// 创建会员
export const createMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, nickname, password, agentId, balance = 0 } = req.body;

    // 验证必填字段
    if (!username || !nickname || !password || !agentId) {
      res.status(400).json({
        status: 'error',
        message: '用户名、昵称、密码和代理商ID不能为空',
        code: 'MISSING_REQUIRED_FIELDS'
      });
      return;
    }

    // 检查用户名是否已存在
    const existingMember = await Member.findOne({
      where: { username }
    });

    if (existingMember) {
      res.status(400).json({
        status: 'error',
        message: '用户名已存在',
        code: 'USERNAME_EXISTS'
      });
      return;
    }

    // 验证代理商是否存在
    const agent = await Agent.findByPk(agentId);
    if (!agent) {
      res.status(400).json({
        status: 'error',
        message: '指定的代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    // 创建会员
    const member = await Member.create({
      username,
      nickname,
      password,
      agentId: Number(agentId),
      balance: Number(balance),
      status: 'active'
    });

    // 获取包含代理商信息的会员数据
    const memberWithAgent = await Member.findByPk(member.id, {
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
      data: {
        member: memberWithAgent!.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('创建会员错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 更新会员信息
export const updateMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { username, nickname, status, password, agentId } = req.body;

    const member = await Member.findByPk(id);
    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    // 如果要更新用户名，检查新用户名是否已存在
    if (username !== undefined && username !== member.username) {
      const existingMember = await Member.findOne({
        where: { username },
        attributes: ['id']
      });
      if (existingMember) {
        res.status(400).json({
          status: 'error',
          message: '用户名已存在',
          code: 'USERNAME_EXISTS'
        });
        return;
      }
      member.username = username;
    }

    // 如果要更新代理商，验证代理商是否存在
    if (agentId !== undefined) {
      const agent = await Agent.findByPk(agentId);
      if (!agent) {
        res.status(400).json({
          status: 'error',
          message: '指定的代理商不存在',
          code: 'AGENT_NOT_FOUND'
        });
        return;
      }
      member.agentId = Number(agentId);
    }

    // 更新字段
    if (nickname !== undefined) member.nickname = nickname;
    if (status !== undefined) member.status = status;
    if (password !== undefined) member.password = password;

    await member.save();

    // 获取包含代理商信息的会员数据
    const memberWithAgent = await Member.findByPk(member.id, {
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      message: '会员信息更新成功',
      data: {
        member: memberWithAgent!.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('更新会员错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 删除会员
export const deleteMember = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const member = await Member.findByPk(id);
    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    await member.destroy();

    res.status(200).json({
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
};

// 调整会员余额
export const adjustMemberBalance = async (req: Request, res: Response): Promise<void> => {
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

    const member = await Member.findByPk(id);
    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    // 调整余额
    await member.adjustBalance(Number(amount), reason, req.admin!.id);

    res.status(200).json({
      status: 'success',
      message: '余额调整成功',
      data: {
        member: member.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('调整余额错误:', error);
    res.status(500).json({
      status: 'error',
      message: error instanceof Error ? error.message : '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取会员交易记录（余额变更日志）
export const getMemberTransactions = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const {
      page = 1,
      limit = 20,
      type,
      start_date,
      end_date
    } = req.query;

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

    const { count, rows } = await BalanceLog.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Member,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      message: '获取会员交易记录成功',
      data: {
        transactions: rows,
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
};

// 获取会员投注记录（暂时返回空数据，等待后续扩展）
export const getMemberBets = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // 验证会员是否存在
    const member = await Member.findByPk(id);
    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    // 暂时返回空数据，等待投注系统开发
    res.status(200).json({
      status: 'success',
      message: '获取会员投注记录成功',
      data: {
        bets: [],
        pagination: {
          total: 0,
          page: Number(page),
          limit: Number(limit),
          totalPages: 0
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
};

// 获取会员个人资料
export const getMemberProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = req.member?.id;

    if (!memberId) {
      res.status(401).json({
        status: 'error',
        message: '未授权访问',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const member = await Member.findByPk(memberId, {
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取个人资料成功',
      data: {
        member: member.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('获取会员个人资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取会员余额
export const getMemberBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = req.member?.id;

    if (!memberId) {
      res.status(401).json({
        status: 'error',
        message: '未授权访问',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    const member = await Member.findByPk(memberId, {
      attributes: ['id', 'username', 'nickname', 'balance', 'status']
    });

    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取余额成功',
      data: {
        balance: member.balance,
        member: {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          status: member.status
        }
      }
    });
  } catch (error) {
    console.error('获取会员余额错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取余额变更日志
export const getBalanceLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      username,
      operatorName,
      type,
      startDate,
      endDate
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

    // 类型过滤
    if (type) {
      whereClause.type = type;
    }

    // 日期范围过滤
    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt[Op.gte] = new Date(startDate as string);
      }
      if (endDate) {
        whereClause.createdAt[Op.lte] = new Date(endDate as string);
      }
    }

    const includeOptions: any[] = [
      {
        model: Member,
        as: 'user',
        attributes: ['id', 'username', 'nickname']
      },
      {
        model: Admin,
        as: 'operator',
        attributes: ['id', 'username']
      }
    ];

    // 会员用户名过滤
    if (username) {
      includeOptions[0].where = {
        username: { [Op.iLike]: `%${username}%` }
      };
    }

    // 操作员用户名过滤
    if (operatorName) {
      includeOptions[1].where = {
        username: { [Op.iLike]: `%${operatorName}%` }
      };
    }

    const { count, rows } = await BalanceLog.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']],
      include: includeOptions
    });

    res.status(200).json({
      status: 'success',
      message: '获取余额变更日志成功',
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
    console.error('获取余额变更日志错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
