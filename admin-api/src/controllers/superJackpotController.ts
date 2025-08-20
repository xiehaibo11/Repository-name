import { Request, Response } from 'express';
import { EnhancedSuperJackpotService } from '../services/enhancedSuperJackpotService';
import { pool } from '../db';

const superJackpotService = new EnhancedSuperJackpotService(pool);

/**
 * 获取超级大奖系统状态
 */
export const getSuperJackpotStatus = async (req: Request, res: Response) => {
  try {
    const stats = await superJackpotService.getJackpotStats();
    
    // 获取最近的日志记录
    const recentLogs = await pool.query(`
      SELECT * FROM super_jackpot_logs 
      ORDER BY created_at DESC 
      LIMIT 10
    `);
    
    // 获取当前配置
    const config = await pool.query(`
      SELECT * FROM super_jackpot_config 
      WHERE config_name = 'default'
    `);
    
    return res.json({
      status: 'success',
      data: {
        stats,
        recent_logs: recentLogs.rows,
        config: config.rows[0],
        system_info: {
          target_probability: 1 / 59600000,
          probability_description: '约5960万分之一',
          contribution_rate: '0.1%',
          base_jackpot: 1000000
        }
      }
    });
  } catch (error: any) {
    console.error('获取超级大奖状态失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取超级大奖状态失败',
      error: error.message
    });
  }
};

/**
 * 获取超级大奖中奖记录
 */
export const getSuperJackpotWinners = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereClause = '';
    const queryParams: any[] = [Number(pageSize), offset];
    
    if (status) {
      whereClause = 'WHERE status = $3';
      queryParams.push(status);
    }
    
    const winnersResult = await pool.query(`
      SELECT w.*, m.username, m.nickname
      FROM super_jackpot_winners w
      LEFT JOIN members m ON w.user_id = m.id
      ${whereClause}
      ORDER BY w.win_time DESC
      LIMIT $1 OFFSET $2
    `, queryParams);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM super_jackpot_winners w
      ${whereClause}
    `, status ? [status] : []);
    
    return res.json({
      status: 'success',
      data: winnersResult.rows,
      pagination: {
        page: Number(page),
        pageSize: Number(pageSize),
        total: Number(countResult.rows[0].total)
      }
    });
  } catch (error: any) {
    console.error('获取超级大奖中奖记录失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取超级大奖中奖记录失败',
      error: error.message
    });
  }
};

/**
 * 获取超级大奖日志
 */
export const getSuperJackpotLogs = async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 50, event_type, is_triggered } = req.query;
    const offset = (Number(page) - 1) * Number(pageSize);
    
    let whereConditions: string[] = [];
    const queryParams: any[] = [Number(pageSize), offset];
    let paramIndex = 3;
    
    if (event_type) {
      whereConditions.push(`event_type = $${paramIndex}`);
      queryParams.push(event_type);
      paramIndex++;
    }
    
    if (is_triggered !== undefined) {
      whereConditions.push(`is_triggered = $${paramIndex}`);
      queryParams.push(is_triggered === 'true');
      paramIndex++;
    }
    
    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';
    
    const logsResult = await pool.query(`
      SELECT * FROM super_jackpot_logs
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `, queryParams);
    
    const countResult = await pool.query(`
      SELECT COUNT(*) as total
      FROM super_jackpot_logs
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
    console.error('获取超级大奖日志失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取超级大奖日志失败',
      error: error.message
    });
  }
};

/**
 * 更新超级大奖配置
 */
export const updateSuperJackpotConfig = async (req: Request & { user?: any }, res: Response) => {
  try {
    const {
      base_probability,
      bet_volume_multiplier,
      jackpot_multiplier,
      time_multiplier,
      max_probability,
      min_bet_amount,
      max_winners_per_issue,
      is_active
    } = req.body;
    
    const operatorId = req.user?.id;
    
    // 验证参数
    if (base_probability && (base_probability <= 0 || base_probability > 1)) {
      return res.status(400).json({
        status: 'error',
        message: '基础概率必须在0到1之间'
      });
    }
    
    if (max_probability && (max_probability <= 0 || max_probability > 1)) {
      return res.status(400).json({
        status: 'error',
        message: '最大概率必须在0到1之间'
      });
    }
    
    if (min_bet_amount && min_bet_amount < 0) {
      return res.status(400).json({
        status: 'error',
        message: '最小投注金额不能为负数'
      });
    }
    
    // 更新配置
    await superJackpotService.updateConfig({
      base_probability,
      bet_volume_multiplier,
      jackpot_multiplier,
      time_multiplier,
      max_probability,
      min_bet_amount,
      max_winners_per_issue,
      is_active
    });
    
    // 记录配置更新日志
    await pool.query(`
      INSERT INTO super_jackpot_logs (
        issue_id, issue_no, event_type, calculation_details
      ) VALUES (0, 'CONFIG_UPDATE', 'config_update', $1)
    `, [JSON.stringify({
      operator_id: operatorId,
      updated_fields: req.body,
      timestamp: new Date().toISOString()
    })]);
    
    return res.json({
      status: 'success',
      message: '超级大奖配置更新成功'
    });
  } catch (error: any) {
    console.error('更新超级大奖配置失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '更新超级大奖配置失败',
      error: error.message
    });
  }
};

/**
 * 支付超级大奖
 */
export const payoutSuperJackpot = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { winnerId } = req.params;
    const operatorId = req.user?.id;
    
    if (!winnerId) {
      return res.status(400).json({
        status: 'error',
        message: '中奖记录ID不能为空'
      });
    }
    
    // 检查中奖记录是否存在
    const winnerResult = await pool.query(`
      SELECT * FROM super_jackpot_winners WHERE id = $1
    `, [winnerId]);
    
    if (winnerResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '中奖记录不存在'
      });
    }
    
    const winner = winnerResult.rows[0];
    
    if (winner.status === 'paid') {
      return res.status(400).json({
        status: 'error',
        message: '该奖项已经支付'
      });
    }
    
    // 执行支付
    await superJackpotService.payoutSuperJackpot(Number(winnerId), operatorId);
    
    return res.json({
      status: 'success',
      message: '超级大奖支付成功',
      data: {
        winner_id: winnerId,
        amount: winner.amount,
        user_id: winner.user_id
      }
    });
  } catch (error: any) {
    console.error('支付超级大奖失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '支付超级大奖失败',
      error: error.message
    });
  }
};

/**
 * 手动触发超级大奖（测试用）
 */
export const manualTriggerSuperJackpot = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { issueId, userId, testMode = true } = req.body;
    const operatorId = req.user?.id;
    
    if (!testMode) {
      return res.status(403).json({
        status: 'error',
        message: '生产环境不允许手动触发超级大奖'
      });
    }
    
    // 这里可以实现测试环境的手动触发逻辑
    // 仅用于测试和演示
    
    return res.json({
      status: 'success',
      message: '手动触发超级大奖成功（测试模式）',
      data: {
        issue_id: issueId,
        user_id: userId,
        test_mode: testMode
      }
    });
  } catch (error: any) {
    console.error('手动触发超级大奖失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '手动触发超级大奖失败',
      error: error.message
    });
  }
};

/**
 * 获取超级大奖统计报表
 */
export const getSuperJackpotReport = async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    
    // 获取指定时间段的统计数据
    const reportResult = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        COUNT(*) as total_checks,
        COUNT(CASE WHEN is_triggered = true THEN 1 END) as triggered_count,
        AVG(final_probability) as avg_probability,
        SUM(total_bet_amount) as total_bet_amount,
        SUM(total_payout) as total_payout
      FROM super_jackpot_logs
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate || '2024-01-01', endDate || new Date().toISOString()]);
    
    // 获取奖金池历史
    const poolHistory = await pool.query(`
      SELECT 
        DATE(created_at) as date,
        SUM(contribution_amount) as daily_contributions
      FROM super_jackpot_contributions
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate || '2024-01-01', endDate || new Date().toISOString()]);
    
    return res.json({
      status: 'success',
      data: {
        daily_stats: reportResult.rows,
        pool_history: poolHistory.rows,
        summary: {
          total_checks: reportResult.rows.reduce((sum, row) => sum + Number(row.total_checks), 0),
          total_triggers: reportResult.rows.reduce((sum, row) => sum + Number(row.triggered_count), 0),
          total_contributions: poolHistory.rows.reduce((sum, row) => sum + Number(row.daily_contributions || 0), 0)
        }
      }
    });
  } catch (error: any) {
    console.error('获取超级大奖报表失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取超级大奖报表失败',
      error: error.message
    });
  }
};
