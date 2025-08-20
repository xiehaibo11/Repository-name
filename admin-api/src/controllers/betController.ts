import { Request, Response } from 'express';

// 获取当前投注数据
export const getCurrentBets = async (req: Request, res: Response) => {
  try {
    // 模拟当前投注数据
    const currentTime = new Date();
    const seconds = currentTime.getSeconds();
    const isInBettingTime = seconds < 50;
    
    // 模拟投注数据
    const mockBets = isInBettingTime ? [
      {
        id: 1,
        username: 'user001',
        betType: '大',
        amount: 100,
        time: new Date().toLocaleTimeString(),
        odds: 1.98
      },
      {
        id: 2,
        username: 'user002',
        betType: '小',
        amount: 50,
        time: new Date().toLocaleTimeString(),
        odds: 1.98
      }
    ] : [];

    const responseData = {
      status: 'success',
      data: {
        bets: mockBets,
        totalBets: mockBets.length,
        totalAmount: mockBets.reduce((sum, bet) => sum + bet.amount, 0),
        onlineMembers: Math.floor(Math.random() * 50) + 100,
        isInBettingTime,
        currentTime: currentTime.toISOString()
      }
    };

    res.json(responseData);
  } catch (error) {
    console.error('获取当前投注数据失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取当前投注数据失败'
    });
  }
};

// 获取投注历史
export const getBetHistory = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, startDate, endDate } = req.query;
    
    // 模拟历史投注数据
    const mockHistory = Array.from({ length: Number(limit) }, (_, index) => ({
      id: index + 1,
      username: `user${String(index + 1).padStart(3, '0')}`,
      betType: ['大', '小', '单', '双'][Math.floor(Math.random() * 4)],
      amount: Math.floor(Math.random() * 500) + 10,
      result: ['赢', '输'][Math.floor(Math.random() * 2)],
      time: new Date(Date.now() - Math.random() * 86400000).toLocaleString(),
      issue: `20250121${String(Math.floor(Math.random() * 1440)).padStart(4, '0')}`
    }));

    res.json({
      status: 'success',
      data: {
        bets: mockHistory,
        total: 1000,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取投注历史失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取投注历史失败'
    });
  }
};

// 获取投注统计
export const getBetStatistics = async (req: Request, res: Response) => {
  try {
    const { period = 'today' } = req.query;
    
    // 模拟统计数据
    const mockStats = {
      totalBets: Math.floor(Math.random() * 1000) + 500,
      totalAmount: Math.floor(Math.random() * 100000) + 50000,
      winRate: (Math.random() * 20 + 40).toFixed(2), // 40-60%
      avgBetAmount: Math.floor(Math.random() * 200) + 50,
      topBetTypes: [
        { type: '大', count: 150, percentage: 35 },
        { type: '小', count: 140, percentage: 33 },
        { type: '单', count: 70, percentage: 16 },
        { type: '双', count: 68, percentage: 16 }
      ],
      hourlyStats: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        bets: Math.floor(Math.random() * 50) + 10,
        amount: Math.floor(Math.random() * 5000) + 1000
      }))
    };

    res.json({
      status: 'success',
      data: mockStats
    });
  } catch (error) {
    console.error('获取投注统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取投注统计失败'
    });
  }
};

// 获取大额投注监控
export const getBigBetMonitoring = async (req: Request, res: Response) => {
  try {
    const { threshold = 1000 } = req.query;
    
    // 模拟大额投注数据
    const mockBigBets = Array.from({ length: 10 }, (_, index) => ({
      id: index + 1,
      username: `vip${String(index + 1).padStart(3, '0')}`,
      betType: ['大', '小', '单', '双'][Math.floor(Math.random() * 4)],
      amount: Math.floor(Math.random() * 5000) + Number(threshold),
      time: new Date(Date.now() - Math.random() * 3600000).toLocaleString(),
      issue: `20250121${String(Math.floor(Math.random() * 1440)).padStart(4, '0')}`,
      status: ['待开奖', '已中奖', '未中奖'][Math.floor(Math.random() * 3)],
      riskLevel: ['低', '中', '高'][Math.floor(Math.random() * 3)]
    }));

    res.json({
      status: 'success',
      data: {
        bigBets: mockBigBets,
        threshold: Number(threshold),
        totalCount: mockBigBets.length,
        totalAmount: mockBigBets.reduce((sum, bet) => sum + bet.amount, 0)
      }
    });
  } catch (error) {
    console.error('获取大额投注监控失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取大额投注监控失败'
    });
  }
};

// 获取会员投注分析
export const getMemberBetAnalysis = async (req: Request, res: Response) => {
  try {
    const { memberId, period = 'week' } = req.query;
    
    // 模拟会员投注分析数据
    const mockAnalysis = {
      memberInfo: {
        id: memberId || 'user001',
        username: `user${memberId || '001'}`,
        level: 'VIP',
        registerDate: '2024-01-01',
        totalDeposit: 50000,
        totalWithdraw: 30000
      },
      bettingStats: {
        totalBets: Math.floor(Math.random() * 500) + 100,
        totalAmount: Math.floor(Math.random() * 50000) + 10000,
        winRate: (Math.random() * 30 + 35).toFixed(2), // 35-65%
        avgBetAmount: Math.floor(Math.random() * 300) + 50,
        maxSingleBet: Math.floor(Math.random() * 2000) + 500,
        favoriteType: ['大', '小', '单', '双'][Math.floor(Math.random() * 4)]
      },
      riskAssessment: {
        riskLevel: ['低', '中', '高'][Math.floor(Math.random() * 3)],
        suspiciousActivity: Math.random() > 0.8,
        notes: '正常投注行为，无异常'
      },
      recentActivity: Array.from({ length: 10 }, (_, index) => ({
        date: new Date(Date.now() - index * 86400000).toLocaleDateString(),
        bets: Math.floor(Math.random() * 20) + 5,
        amount: Math.floor(Math.random() * 2000) + 200,
        result: Math.floor(Math.random() * 400) - 200 // 盈亏
      }))
    };

    res.json({
      status: 'success',
      data: mockAnalysis
    });
  } catch (error) {
    console.error('获取会员投注分析失败:', error);
    res.status(500).json({
      status: 'error',
      message: '获取会员投注分析失败'
    });
  }
};
