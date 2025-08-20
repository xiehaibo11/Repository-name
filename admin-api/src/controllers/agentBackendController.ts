import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Agent, Member, CreditLog } from '../models';

// 代理商仪表盘数据
export const getAgentDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.agent?.id;
    
    if (!agentId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    // 获取代理商信息
    const agent = await Agent.findByPk(agentId);
    
    if (!agent) {
      res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    // 获取会员统计
    const memberStats = await Member.findAndCountAll({
      where: { agentId },
      attributes: ['status']
    });

    const activeMembers = memberStats.rows.filter(m => m.status === 'active').length;
    const totalMembers = memberStats.count;

    // 获取最近的信用额度变更
    const recentCreditLogs = await CreditLog.findAll({
      where: { 
        userId: agentId,
        userType: 'agent'
      },
      order: [['createdAt', 'DESC']],
      limit: 5
    });

    res.status(200).json({
      status: 'success',
      message: '获取仪表盘数据成功',
      data: {
        agent: agent.toSafeJSON(),
        stats: {
          totalMembers,
          activeMembers,
          inactiveMembers: totalMembers - activeMembers,
          currentCredit: agent.credit
        },
        recentCreditLogs: recentCreditLogs.map(log => ({
          id: log.id,
          amount: log.amount,
          previousAmount: log.previousAmount,
          newAmount: log.newAmount,
          type: log.type,
          reason: log.reason,
          createdAt: log.createdAt
        }))
      }
    });
  } catch (error) {
    console.error('获取代理商仪表盘错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取代理商的会员列表
export const getAgentMembers = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.agent?.id;
    const {
      page = 1,
      limit = 20,
      status,
      search
    } = req.query;

    if (!agentId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { agentId };

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

    const { count, rows } = await Member.findAndCountAll({
      where: whereClause,
      limit: Number(limit),
      offset,
      order: [['createdAt', 'DESC']]
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
    console.error('获取代理商会员列表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取代理商的信用额度日志
export const getAgentCreditLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.agent?.id;
    const {
      page = 1,
      limit = 20,
      type,
      start_date,
      end_date
    } = req.query;

    if (!agentId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = { 
      userId: agentId,
      userType: 'agent'
    };

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
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      status: 'success',
      message: '获取信用额度日志成功',
      data: {
        logs: rows.map(log => ({
          id: log.id,
          amount: log.amount,
          previousAmount: log.previousAmount,
          newAmount: log.newAmount,
          type: log.type,
          reason: log.reason,
          createdAt: log.createdAt
        })),
        pagination: {
          total: count,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(count / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取代理商信用额度日志错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
