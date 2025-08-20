import { Request, Response } from 'express';
import { AvoidWinService } from '../services/avoidWinService';
import { SSCService } from '../modules/ssc/SSCService';
import { pool } from '../db';

const avoidWinService = new AvoidWinService(pool);
const sscService = SSCService.getInstance(pool);

/**
 * 获取避开中奖系统状态
 */
export const getAvoidWinStatus = async (req: Request, res: Response) => {
  try {
    // 返回模拟数据，不依赖数据库表
    return res.json({
      status: 'success',
      data: {
        config: {
          config_name: 'default',
          allow_win_probability: 0.0000000168,
          system_enabled: true,
          min_bet_amount: 1.00,
          max_analysis_combinations: 100000,
          analysis_timeout_seconds: 30,
          description: '默认避开中奖配置 - 约5960万分之一允许会员中奖概率'
        },
        stats: {
          total_issues: 1440, // 假设今天已处理1440期
          avoided_count: 1440, // 全部避开
          allowed_count: 0,    // 没有允许中奖
          avg_combinations: 15000, // 平均每期15000个中奖组合
          avg_analysis_time: 250   // 平均分析时间250ms
        },
        recent_logs: [
          {
            id: 1,
            issue_no: '20241201001',
            decision_type: 'member_win_avoided',
            draw_numbers: '42680',
            total_bets: 156,
            winning_combinations_count: 15234,
            analysis_time_ms: 245,
            created_at: new Date().toISOString()
          }
        ],
        today_stats: {
          stat_date: new Date().toISOString().split('T')[0],
          total_issues: 1440,
          total_bets: 224640,
          avoided_issues: 1440,
          allowed_issues: 0,
          member_wins: 0,
          avoid_success_rate: 100.0000,
          system_profit: 2246400.00
        },
        system_info: {
          allow_win_probability: 0.0000000168,
          probability_description: '约5960万分之一',
          system_enabled: true,
          total_combinations: 100000,
          description: '系统主动避开会员投注号码，确保极低中奖率',
          theoretical_win_interval_days: Math.round(1 / 0.0000000168 / 1440), // 约41389天
          estimated_years: Math.round(1 / 0.0000000168 / 1440 / 365) // 约113年
        }
      }
    });
  } catch (error: any) {
    console.error('获取避开中奖系统状态失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取避开中奖系统状态失败',
      error: error.message
    });
  }
};

/**
 * 获取避开中奖决策日志
 */
export const getAvoidWinLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, decision_type, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereConditions: string[] = [];
    const queryParams: any[] = [Number(pageSize), offset];
    let paramIndex = 3;
    
    if (decision_type) {
      whereConditions.push(`decision_type = $${paramIndex}`);
      queryParams.push(decision_type);
      paramIndex++;
    }
    
    if (date_from) {
      whereConditions.push(`created_at >= $${paramIndex}`);
      queryParams.push(date_from);
      paramIndex++;
    }
    
    if (date_to) {
      whereConditions.push(`created_at <= $${paramIndex}`);
      queryParams.push(date_to);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const logsResult = await pool.query(`
      SELECT 
        awl.*,
        li.start_time,
        li.end_time
      FROM avoid_win_logs awl
      LEFT JOIN lottery_issues li ON awl.issue_id = li.id
      ${whereClause}
      ORDER BY awl.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM avoid_win_logs awl
      ${whereClause}
    `, queryParams.slice(2));
    
    return res.json({
      status: 'success',
      data: logsResult.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(countResult.rows[0].total)
      }
    });
  } catch (error: any) {
    console.error('获取避开中奖日志失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取避开中奖日志失败',
      error: error.message
    });
  }
};

/**
 * 获取会员投注分析记录
 */
export const getMemberBetAnalysis = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, issue_no } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereClause = '';
    const queryParams: any[] = [Number(pageSize), offset];
    
    if (issue_no) {
      whereClause = 'WHERE mba.issue_no = $3';
      queryParams.push(issue_no);
    }
    
    const analysisResult = await pool.query(`
      SELECT 
        mba.*,
        li.start_time,
        li.end_time
      FROM member_bet_analysis mba
      LEFT JOIN lottery_issues li ON mba.issue_id = li.id
      ${whereClause}
      ORDER BY mba.created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM member_bet_analysis mba
      ${whereClause}
    `, issue_no ? [issue_no] : []);
    
    return res.json({
      status: 'success',
      data: analysisResult.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(countResult.rows[0].total)
      }
    });
  } catch (error: any) {
    console.error('获取会员投注分析失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取会员投注分析失败',
      error: error.message
    });
  }
};

/**
 * 获取会员中奖记录（极少数情况）
 */
export const getMemberWinRecords = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status, user_id } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereConditions: string[] = [];
    const queryParams: any[] = [Number(pageSize), offset];
    let paramIndex = 3;
    
    if (status) {
      whereConditions.push(`mwr.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }
    
    if (user_id) {
      whereConditions.push(`mwr.user_id = $${paramIndex}`);
      queryParams.push(user_id);
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const recordsResult = await pool.query(`
      SELECT 
        mwr.*,
        m.username,
        m.nickname,
        li.start_time,
        li.end_time
      FROM member_win_records mwr
      LEFT JOIN members m ON mwr.user_id = m.id
      LEFT JOIN lottery_issues li ON mwr.issue_id = li.id
      ${whereClause}
      ORDER BY mwr.win_time DESC
      LIMIT $1 OFFSET $2
    `, queryParams);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM member_win_records mwr
      ${whereClause}
    `, queryParams.slice(2));
    
    return res.json({
      status: 'success',
      data: recordsResult.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(countResult.rows[0].total)
      }
    });
  } catch (error: any) {
    console.error('获取会员中奖记录失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取会员中奖记录失败',
      error: error.message
    });
  }
};

/**
 * 更新避开中奖系统配置
 */
export const updateAvoidWinConfig = async (req: Request, res: Response) => {
  try {
    const {
      allow_win_probability,
      system_enabled,
      min_bet_amount,
      max_analysis_combinations,
      analysis_timeout_seconds,
      description
    } = req.body;

    const operatorId = 1; // 默认操作员ID
    
    // 验证参数
    if (allow_win_probability !== undefined && (allow_win_probability <= 0 || allow_win_probability > 1)) {
      return res.status(400).json({
        status: 'error',
        message: '允许中奖概率必须在0到1之间'
      });
    }
    
    if (min_bet_amount !== undefined && min_bet_amount < 0) {
      return res.status(400).json({
        status: 'error',
        message: '最小投注金额不能为负数'
      });
    }
    
    // 更新配置
    await avoidWinService.updateSystemConfig({
      allow_win_probability,
      system_enabled,
      min_bet_amount,
      max_analysis_combinations,
      analysis_timeout_seconds,
      description
    }, operatorId);
    
    return res.json({
      status: 'success',
      message: '避开中奖系统配置更新成功'
    });
  } catch (error: any) {
    console.error('更新避开中奖系统配置失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '更新避开中奖系统配置失败',
      error: error.message
    });
  }
};

/**
 * 获取避开中奖统计报表
 */
export const getAvoidWinReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 获取指定时间段的统计数据
    const reportResult = await pool.query(`
      SELECT 
        stat_date,
        total_issues,
        total_bets,
        total_bet_amount,
        avoided_issues,
        allowed_issues,
        member_wins,
        total_member_winnings,
        system_profit,
        avoid_success_rate,
        average_analysis_time_ms
      FROM avoid_win_statistics
      WHERE stat_date >= $1 AND stat_date <= $2
      ORDER BY stat_date DESC
    `, [startDate || '2024-01-01', endDate || new Date().toISOString().split('T')[0]]);
    
    // 获取决策类型分布
    const decisionDistribution = await pool.query(`
      SELECT 
        decision_type,
        COUNT(*) as count,
        AVG(analysis_time_ms) as avg_analysis_time
      FROM avoid_win_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY decision_type
      ORDER BY count DESC
    `, [startDate || '2024-01-01', endDate || new Date().toISOString()]);
    
    // 计算汇总数据
    const summary = reportResult.rows.reduce((acc, row) => ({
      total_issues: acc.total_issues + Number(row.total_issues),
      total_bets: acc.total_bets + Number(row.total_bets),
      total_bet_amount: acc.total_bet_amount + Number(row.total_bet_amount),
      avoided_issues: acc.avoided_issues + Number(row.avoided_issues),
      allowed_issues: acc.allowed_issues + Number(row.allowed_issues),
      member_wins: acc.member_wins + Number(row.member_wins),
      total_member_winnings: acc.total_member_winnings + Number(row.total_member_winnings),
      system_profit: acc.system_profit + Number(row.system_profit)
    }), {
      total_issues: 0,
      total_bets: 0,
      total_bet_amount: 0,
      avoided_issues: 0,
      allowed_issues: 0,
      member_wins: 0,
      total_member_winnings: 0,
      system_profit: 0
    });
    
    return res.json({
      status: 'success',
      data: {
        daily_stats: reportResult.rows,
        decision_distribution: decisionDistribution.rows,
        summary: {
          ...summary,
          avoid_success_rate: summary.total_issues > 0 ? (summary.avoided_issues / summary.total_issues * 100) : 100,
          profit_rate: summary.total_bet_amount > 0 ? (summary.system_profit / summary.total_bet_amount * 100) : 0
        }
      }
    });
  } catch (error: any) {
    console.error('获取避开中奖报表失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取避开中奖报表失败',
      error: error.message
    });
  }
};
