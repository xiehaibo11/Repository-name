import { Router } from 'express';
import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Admin, Agent, Member, CreditLog, BalanceLog } from '../models';
import { authenticateToken } from '../middleware/auth';

const router = Router();

/**
 * @route GET /dashboard/stats
 * @desc 获取仪表盘统计数据
 * @access Private
 */
router.get('/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    // 获取基础统计数据
    const [
      totalAgents,
      activeAgents,
      totalMembers,
      activeMembers,
      totalAdmins,
      totalCreditResult,
      totalBalanceResult,
      todayAgents,
      todayMembers,
      recentCreditOps,
      recentBalanceOps
    ] = await Promise.all([
      // 代理商统计
      Agent.count(),
      Agent.count({ where: { status: 'active' } }),
      
      // 会员统计
      Member.count(),
      Member.count({ where: { status: 'active' } }),
      
      // 管理员统计
      Admin.count(),
      
      // 总信用额度
      Agent.sum('credit'),
      
      // 总余额
      Member.sum('balance'),
      
      // 今日新增代理商
      Agent.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // 今日新增会员
      Member.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      }),
      
      // 最近信用额度操作
      CreditLog.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
          }
        }
      }),
      
      // 最近余额操作
      BalanceLog.count({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 24 * 60 * 60 * 1000) // 24小时内
          }
        }
      })
    ]);

    res.json({
      status: 'success',
      message: '获取统计信息成功',
      data: {
        overview: {
          totalAgents,
          activeAgents,
          totalMembers,
          activeMembers,
          totalAdmins,
          totalCredit: totalCreditResult || 0,
          totalBalance: totalBalanceResult || 0
        },
        today: {
          newAgents: todayAgents,
          newMembers: todayMembers
        },
        recent: {
          creditOperations: recentCreditOps,
          balanceOperations: recentBalanceOps
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
});

/**
 * @route GET /dashboard/charts
 * @desc 获取图表数据
 * @access Private
 */
router.get('/charts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { period = 'week' } = req.query;
    
    let days = 7;
    if (period === 'month') days = 30;
    if (period === 'year') days = 365;

    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    // 获取时间序列数据
    const agentData = [];
    const memberData = [];
    const creditData = [];
    const balanceData = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dayStart = new Date(date.setHours(0, 0, 0, 0));
      const dayEnd = new Date(date.setHours(23, 59, 59, 999));

      const [agentCount, memberCount, creditSum, balanceSum] = await Promise.all([
        Agent.count({
          where: {
            createdAt: {
              [Op.between]: [dayStart, dayEnd]
            }
          }
        }),
        Member.count({
          where: {
            createdAt: {
              [Op.between]: [dayStart, dayEnd]
            }
          }
        }),
        CreditLog.sum('amount', {
          where: {
            createdAt: {
              [Op.between]: [dayStart, dayEnd]
            },
            amount: { [Op.gt]: 0 } // 只统计正数（增加的信用额度）
          }
        }),
        BalanceLog.sum('amount', {
          where: {
            createdAt: {
              [Op.between]: [dayStart, dayEnd]
            },
            amount: { [Op.gt]: 0 } // 只统计正数（增加的余额）
          }
        })
      ]);

      agentData.push({
        date: dayStart.toISOString().split('T')[0],
        count: agentCount
      });

      memberData.push({
        date: dayStart.toISOString().split('T')[0],
        count: memberCount
      });

      creditData.push({
        date: dayStart.toISOString().split('T')[0],
        amount: creditSum || 0
      });

      balanceData.push({
        date: dayStart.toISOString().split('T')[0],
        amount: balanceSum || 0
      });
    }

    res.json({
      status: 'success',
      message: '获取图表数据成功',
      data: {
        period,
        agents: agentData,
        members: memberData,
        credits: creditData,
        balances: balanceData
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
});

/**
 * @route GET /dashboard/activities
 * @desc 获取系统活动日志
 * @access Private
 */
router.get('/activities', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    // 获取最近的信用额度和余额操作记录
    const [creditLogs, balanceLogs] = await Promise.all([
      CreditLog.findAll({
        include: [
          {
            model: Agent,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        limit: Math.ceil(Number(limit) / 2),
        offset: Math.floor(offset / 2),
        order: [['createdAt', 'DESC']]
      }),
      BalanceLog.findAll({
        include: [
          {
            model: Member,
            as: 'user',
            attributes: ['id', 'username', 'nickname']
          }
        ],
        limit: Math.ceil(Number(limit) / 2),
        offset: Math.floor(offset / 2),
        order: [['createdAt', 'DESC']]
      })
    ]);

    // 合并并排序活动记录
    const activities = [
      ...creditLogs.map(log => ({
        id: `credit_${log.id}`,
        type: 'credit',
        action: log.amount > 0 ? '增加信用额度' : '减少信用额度',
        user: (log as any).user || { id: log.userId, username: '未知', nickname: '未知代理商' },
        amount: log.amount,
        reason: log.reason,
        createdAt: log.createdAt
      })),
      ...balanceLogs.map(log => ({
        id: `balance_${log.id}`,
        type: 'balance',
        action: log.amount > 0 ? '增加余额' : '减少余额',
        user: (log as any).user || { id: log.userId, username: '未知', nickname: '未知会员' },
        amount: log.amount,
        reason: log.reason,
        createdAt: log.createdAt
      }))
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
     .slice(0, Number(limit));

    res.json({
      status: 'success',
      message: '获取活动日志成功',
      data: {
        activities,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: activities.length
        }
      }
    });
  } catch (error) {
    console.error('获取活动日志错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
});

export default router;
