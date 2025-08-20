import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Admin, Agent, Member, CreditLog, BalanceLog } from '../models';

// 获取摘要统计信息
export const getStats = async (req: Request, res: Response): Promise<void> => {
  try {
    // 获取基础统计数据
    const [
      totalAgents,
      activeAgents,
      totalMembers,
      activeMembers,
      totalAdmins
    ] = await Promise.all([
      Agent.count(),
      Agent.count({ where: { status: 'active' } }),
      Member.count(),
      Member.count({ where: { status: 'active' } }),
      Admin.count()
    ]);

    // 获取总信用额度和总余额
    const [creditSum, balanceSum] = await Promise.all([
      Agent.sum('credit'),
      Member.sum('balance')
    ]);

    // 获取今日新增数据
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [todayAgents, todayMembers] = await Promise.all([
      Agent.count({
        where: {
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      }),
      Member.count({
        where: {
          createdAt: {
            [Op.gte]: today,
            [Op.lt]: tomorrow
          }
        }
      })
    ]);

    // 获取最近7天的活动统计
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const [recentCreditLogs, recentBalanceLogs] = await Promise.all([
      CreditLog.count({
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo
          }
        }
      }),
      BalanceLog.count({
        where: {
          createdAt: {
            [Op.gte]: sevenDaysAgo
          }
        }
      })
    ]);

    res.status(200).json({
      status: 'success',
      message: '获取统计信息成功',
      data: {
        overview: {
          totalAgents,
          activeAgents,
          totalMembers,
          activeMembers,
          totalAdmins,
          totalCredit: creditSum || 0,
          totalBalance: balanceSum || 0
        },
        today: {
          newAgents: todayAgents,
          newMembers: todayMembers
        },
        recent: {
          creditOperations: recentCreditLogs,
          balanceOperations: recentBalanceLogs
        }
      }
    });
  } catch (error) {
    console.error('获取统计信息错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取图表数据
export const getCharts = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = 'week' } = req.query;
    
    let days = 7;
    if (period === 'month') days = 30;
    else if (period === 'year') days = 365;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    // 生成日期数组
    const dateArray = [];
    for (let i = 0; i < days; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      dateArray.push({
        date: date.toISOString().split('T')[0],
        fullDate: new Date(date)
      });
    }

    // 获取每日新增代理商数据
    const agentData = await Promise.all(
      dateArray.map(async ({ date, fullDate }) => {
        const nextDay = new Date(fullDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = await Agent.count({
          where: {
            createdAt: {
              [Op.gte]: fullDate,
              [Op.lt]: nextDay
            }
          }
        });
        
        return { date, count };
      })
    );

    // 获取每日新增会员数据
    const memberData = await Promise.all(
      dateArray.map(async ({ date, fullDate }) => {
        const nextDay = new Date(fullDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const count = await Member.count({
          where: {
            createdAt: {
              [Op.gte]: fullDate,
              [Op.lt]: nextDay
            }
          }
        });
        
        return { date, count };
      })
    );

    // 获取每日操作统计
    const operationData = await Promise.all(
      dateArray.map(async ({ date, fullDate }) => {
        const nextDay = new Date(fullDate);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const [creditOps, balanceOps] = await Promise.all([
          CreditLog.count({
            where: {
              createdAt: {
                [Op.gte]: fullDate,
                [Op.lt]: nextDay
              }
            }
          }),
          BalanceLog.count({
            where: {
              createdAt: {
                [Op.gte]: fullDate,
                [Op.lt]: nextDay
              }
            }
          })
        ]);
        
        return { date, creditOps, balanceOps };
      })
    );

    // 获取代理商状态分布
    const agentStatusData = await Agent.findAll({
      attributes: [
        'status',
        [Agent.sequelize!.fn('COUNT', Agent.sequelize!.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    // 获取会员状态分布
    const memberStatusData = await Member.findAll({
      attributes: [
        'status',
        [Member.sequelize!.fn('COUNT', Member.sequelize!.col('id')), 'count']
      ],
      group: ['status'],
      raw: true
    });

    res.status(200).json({
      status: 'success',
      message: '获取图表数据成功',
      data: {
        period,
        userGrowth: {
          agents: agentData,
          members: memberData
        },
        operations: operationData,
        distribution: {
          agentStatus: agentStatusData,
          memberStatus: memberStatusData
        }
      }
    });
  } catch (error) {
    console.error('获取图表数据错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取系统活动日志
export const getActivities = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      start_date,
      end_date
    } = req.query;

    const offset = (Number(page) - 1) * Number(limit);
    const whereClause: any = {};

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

    // 获取信用额度日志
    const creditLogs = await CreditLog.findAll({
      where: whereClause,
      limit: Math.ceil(Number(limit) / 2),
      offset: Math.floor(offset / 2),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Agent,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    // 获取余额日志
    const balanceLogs = await BalanceLog.findAll({
      where: whereClause,
      limit: Math.ceil(Number(limit) / 2),
      offset: Math.floor(offset / 2),
      order: [['createdAt', 'DESC']],
      include: [
        {
          model: Member,
          as: 'user',
          attributes: ['id', 'username', 'nickname']
        }
      ]
    });

    // 合并并格式化活动日志
    const activities = [
      ...creditLogs.map(log => ({
        id: `credit_${log.id}`,
        type: 'credit_adjustment',
        description: `调整代理商 ${(log as any).user?.nickname || (log as any).user?.username} 信用额度 ${log.amount > 0 ? '+' : ''}${log.amount}`,
        amount: log.amount,
        reason: log.reason,
        user: (log as any).user,
        userType: 'agent',
        createdAt: log.createdAt
      })),
      ...balanceLogs.map(log => ({
        id: `balance_${log.id}`,
        type: 'balance_adjustment',
        description: `调整会员 ${(log as any).user?.nickname || (log as any).user?.username} 余额 ${log.amount > 0 ? '+' : ''}${log.amount}`,
        amount: log.amount,
        reason: log.reason,
        user: (log as any).user,
        userType: 'member',
        createdAt: log.createdAt
      }))
    ];

    // 按时间排序
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // 截取指定数量
    const paginatedActivities = activities.slice(0, Number(limit));

    res.status(200).json({
      status: 'success',
      message: '获取系统活动日志成功',
      data: {
        activities: paginatedActivities,
        pagination: {
          total: activities.length,
          page: Number(page),
          limit: Number(limit),
          totalPages: Math.ceil(activities.length / Number(limit))
        }
      }
    });
  } catch (error) {
    console.error('获取系统活动日志错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
