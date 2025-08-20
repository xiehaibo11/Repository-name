import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Admin, Agent, Member, CreditLog, BalanceLog } from '../models';

// 获取业务报表数据
export const getBusinessReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d', startDate, endDate } = req.query;
    
    // 计算时间范围
    let start: Date;
    let end: Date = new Date();
    
    if (startDate && endDate) {
      start = new Date(startDate as string);
      end = new Date(endDate as string);
    } else {
      const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
      start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    }

    // 获取统计卡片数据
    const [
      totalOrders,
      totalRevenue, 
      totalProfit,
      activeUsers,
      previousPeriodOrders,
      previousPeriodRevenue,
      previousPeriodProfit,
      previousPeriodUsers
    ] = await Promise.all([
      // 当前周期数据
      CreditLog.count({
        where: {
          createdAt: { [Op.between]: [start, end] }
        }
      }),
      CreditLog.sum('amount', {
        where: {
          createdAt: { [Op.between]: [start, end] },
          amount: { [Op.gt]: 0 }
        }
      }),
      BalanceLog.sum('amount', {
        where: {
          createdAt: { [Op.between]: [start, end] },
          amount: { [Op.gt]: 0 }
        }
      }),
      Member.count({
        where: {
          status: 'active',
          createdAt: { [Op.lte]: end }
        }
      }),
      
      // 上一周期数据（用于计算增长率）
      CreditLog.count({
        where: {
          createdAt: { 
            [Op.between]: [
              new Date(start.getTime() - (end.getTime() - start.getTime())),
              start
            ]
          }
        }
      }),
      CreditLog.sum('amount', {
        where: {
          createdAt: { 
            [Op.between]: [
              new Date(start.getTime() - (end.getTime() - start.getTime())),
              start
            ]
          },
          amount: { [Op.gt]: 0 }
        }
      }),
      BalanceLog.sum('amount', {
        where: {
          createdAt: { 
            [Op.between]: [
              new Date(start.getTime() - (end.getTime() - start.getTime())),
              start
            ]
          },
          amount: { [Op.gt]: 0 }
        }
      }),
      Member.count({
        where: {
          status: 'active',
          createdAt: { 
            [Op.lte]: new Date(start.getTime() - (end.getTime() - start.getTime()))
          }
        }
      })
    ]);

    // 计算增长率
    const calculateGrowth = (current: number, previous: number) => {
      if (previous === 0) return current > 0 ? 100 : 0;
      return Number(((current - previous) / previous * 100).toFixed(1));
    };

    const statsCards = [
      {
        title: "总订单数",
        value: totalOrders || 0,
        changePercent: calculateGrowth(totalOrders || 0, previousPeriodOrders || 0),
        isUp: (totalOrders || 0) >= (previousPeriodOrders || 0)
      },
      {
        title: "总收入", 
        value: Math.round(totalRevenue || 0),
        changePercent: calculateGrowth(totalRevenue || 0, previousPeriodRevenue || 0),
        isUp: (totalRevenue || 0) >= (previousPeriodRevenue || 0)
      },
      {
        title: "总利润",
        value: Math.round(totalProfit || 0),
        changePercent: calculateGrowth(totalProfit || 0, previousPeriodProfit || 0),
        isUp: (totalProfit || 0) >= (previousPeriodProfit || 0)
      },
      {
        title: "活跃用户",
        value: activeUsers || 0,
        changePercent: calculateGrowth(activeUsers || 0, previousPeriodUsers || 0),
        isUp: (activeUsers || 0) >= (previousPeriodUsers || 0)
      }
    ];

    // 获取趋势数据
    const trendData = [];
    const days = Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
    
    for (let i = 0; i < days; i++) {
      const dayStart = new Date(start.getTime() + i * 24 * 60 * 60 * 1000);
      const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
      
      const [dayOrders, dayRevenue] = await Promise.all([
        CreditLog.count({
          where: {
            createdAt: { [Op.between]: [dayStart, dayEnd] }
          }
        }),
        CreditLog.sum('amount', {
          where: {
            createdAt: { [Op.between]: [dayStart, dayEnd] },
            amount: { [Op.gt]: 0 }
          }
        })
      ]);
      
      trendData.push({
        date: dayStart.toISOString().split('T')[0],
        orders: dayOrders || 0,
        revenue: Math.round(dayRevenue || 0)
      });
    }

    // 获取业务详情数据
    const businessDetails = await CreditLog.findAll({
      where: {
        createdAt: { [Op.between]: [start, end] }
      },
      include: [
        {
          model: Agent,
          as: 'user',
          attributes: ['username', 'nickname']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 50
    });

    const businessData = businessDetails.map(log => ({
      date: log.createdAt.toISOString().split('T')[0],
      region: '华东', // 模拟数据
      category: log.type === 'admin' ? '管理调整' : '系统操作',
      orders: 1,
      revenue: Math.round(Number(log.amount)),
      profit: Math.round(Number(log.amount) * 0.3),
      growth: Math.random() * 20 - 10, // 模拟增长率
      status: log.amount > 0 ? '正常' : '异常'
    }));

    res.status(200).json({
      status: 'success',
      message: '获取业务报表成功',
      data: {
        period,
        dateRange: {
          start: start.toISOString().split('T')[0],
          end: end.toISOString().split('T')[0]
        },
        statsCards,
        trendData,
        businessData
      }
    });
  } catch (error) {
    console.error('获取业务报表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取财务报表数据
export const getFinancialReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = new Date();

    // 获取财务统计数据
    const [totalIncome, totalExpense, totalBalance, totalCredit] = await Promise.all([
      BalanceLog.sum('amount', {
        where: {
          createdAt: { [Op.between]: [start, end] },
          amount: { [Op.gt]: 0 }
        }
      }),
      BalanceLog.sum('amount', {
        where: {
          createdAt: { [Op.between]: [start, end] },
          amount: { [Op.lt]: 0 }
        }
      }),
      Member.sum('balance'),
      Agent.sum('credit')
    ]);

    const financialStats = [
      {
        title: "总收入",
        value: Math.round(totalIncome || 0),
        changePercent: 12.5,
        isUp: true
      },
      {
        title: "总支出", 
        value: Math.abs(Math.round(totalExpense || 0)),
        changePercent: 8.3,
        isUp: false
      },
      {
        title: "账户余额",
        value: Math.round(totalBalance || 0),
        changePercent: 15.2,
        isUp: true
      },
      {
        title: "信用额度",
        value: Math.round(totalCredit || 0),
        changePercent: 5.7,
        isUp: true
      }
    ];

    res.status(200).json({
      status: 'success',
      message: '获取财务报表成功',
      data: {
        period,
        financialStats
      }
    });
  } catch (error) {
    console.error('获取财务报表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取用户报表数据
export const getUserReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { period = '30d' } = req.query;
    const days = period === '7d' ? 7 : period === '30d' ? 30 : 90;
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const end = new Date();

    // 获取用户统计数据
    const [totalUsers, newUsers, activeAgents, activeMembers] = await Promise.all([
      Member.count(),
      Member.count({
        where: {
          createdAt: { [Op.between]: [start, end] }
        }
      }),
      Agent.count({
        where: { status: 'active' }
      }),
      Member.count({
        where: { status: 'active' }
      })
    ]);

    const userStats = [
      {
        title: "总用户数",
        value: totalUsers || 0,
        changePercent: 18.2,
        isUp: true
      },
      {
        title: "新增用户",
        value: newUsers || 0,
        changePercent: 25.1,
        isUp: true
      },
      {
        title: "活跃代理商",
        value: activeAgents || 0,
        changePercent: 12.3,
        isUp: true
      },
      {
        title: "活跃会员",
        value: activeMembers || 0,
        changePercent: 8.7,
        isUp: true
      }
    ];

    res.status(200).json({
      status: 'success',
      message: '获取用户报表成功',
      data: {
        period,
        userStats
      }
    });
  } catch (error) {
    console.error('获取用户报表错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
