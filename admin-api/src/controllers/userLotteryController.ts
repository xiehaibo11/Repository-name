import { Request, Response } from 'express';
import { UserLotteryService } from '../services/userLotteryService';
import { pool } from '../db';

const userLotteryService = new UserLotteryService(pool);

// 获取彩种游戏数据
export const getLotteryGameData = async (req: Request, res: Response) => {
  try {
    const { lotteryCode } = req.params;
    
    if (!lotteryCode) {
      return res.status(400).json({
        status: 'error',
        message: '彩种代码不能为空'
      });
    }

    const gameData = await userLotteryService.getLotteryGameData(lotteryCode);

    return res.json({
      status: 'success',
      message: '获取游戏数据成功',
      data: gameData
    });
  } catch (error: any) {
    console.error('获取游戏数据失败失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取游戏数据失败',
      error: error.message
    });
  }
};

// 获取投注分析数据
export const getBetAnalysis = async (req: Request, res: Response) => {
  try {
    const { lotteryCode } = req.params;
    const limit = parseInt(req.query.limit as string) || 100;
    
    if (!lotteryCode) {
      return res.status(400).json({
        status: 'error',
        message: '彩种代码不能为空'
      });
    }

    const analysis = await userLotteryService.getBetAnalysis(lotteryCode, limit);

    return res.json({
      status: 'success',
      message: '获取投注分析成功',
      data: analysis
    });
  } catch (error: any) {
    console.error('获取投注分析失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取投注分析失败',
      error: error.message
    });
  }
};

// 获取开奖历史（用户端）
export const getUserDrawHistory = async (req: Request, res: Response) => {
  try {
    const { lotteryCode } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const date = req.query.date as string;
    
    if (!lotteryCode) {
      return res.status(400).json({
        status: 'error',
        message: '彩种代码不能为空'
      });
    }

    // 获取彩种ID
    const lotteryResult = await pool.query(
      'SELECT id FROM lottery_types WHERE code = $1 AND status = $2',
      [lotteryCode, 'active']
    );

    if (lotteryResult.rows.length === 0) {
      return res.status(404).json({
        status: 'error',
        message: '彩种不存在或已停用'
      });
    }

    const lotteryTypeId = lotteryResult.rows[0].id;

    // 构建查询条件
    let whereClause = 'WHERE d.lottery_type_id = $1 AND d.draw_status = $2';
    const values = [lotteryTypeId, 'drawn'];
    let paramIndex = 3;

    if (date) {
      whereClause += ` AND DATE(d.draw_time) = $${paramIndex}`;
      values.push(date);
      paramIndex++;
    }

    // 获取总数
    const countQuery = `
      SELECT COUNT(*) FROM lottery_draws d ${whereClause}
    `;
    const countResult = await pool.query(countQuery, values);
    const total = parseInt(countResult.rows[0].count);

    // 获取数据
    const offset = (page - 1) * pageSize;
    const dataQuery = `
      SELECT 
        d.id, d.issue_no, d.draw_numbers, d.wan_wei, d.qian_wei, 
        d.bai_wei, d.shi_wei, d.ge_wei, d.sum_value, d.sum_big_small, 
        d.sum_odd_even, d.draw_time,
        lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      ${whereClause}
      ORDER BY d.draw_time DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    values.push(pageSize, offset);

    const dataResult = await pool.query(dataQuery, values);

    return res.json({
      status: 'success',
      message: '获取开奖历史成功',
      data: dataResult.rows,
      pagination: {
        page,
        pageSize,
        total
      }
    });
  } catch (error: any) {
    console.error('获取开奖历史失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取开奖历史失败',
      error: error.message
    });
  }
};

// 获取最新开奖结果
export const getLatestDraw = async (req: Request, res: Response) => {
  try {
    const { lotteryCode } = req.params;
    
    if (!lotteryCode) {
      return res.status(400).json({
        status: 'error',
        message: '彩种代码不能为空'
      });
    }

    const query = `
      SELECT 
        d.id, d.issue_no, d.draw_numbers, d.wan_wei, d.qian_wei, 
        d.bai_wei, d.shi_wei, d.ge_wei, d.sum_value, d.sum_big_small, 
        d.sum_odd_even, d.draw_time,
        lt.name as lottery_name
      FROM lottery_draws d
      JOIN lottery_types lt ON d.lottery_type_id = lt.id
      WHERE lt.code = $1 AND d.draw_status = $2
      ORDER BY d.draw_time DESC
      LIMIT 1
    `;

    const result = await pool.query(query, [lotteryCode, 'drawn']);

    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        message: '暂无开奖记录',
        data: null
      });
    }

    return res.json({
      status: 'success',
      message: '获取最新开奖结果成功',
      data: result.rows[0]
    });
  } catch (error: any) {
    console.error('获取最新开奖结果失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取最新开奖结果失败',
      error: error.message
    });
  }
};

// 获取当前期号信息
export const getCurrentIssue = async (req: Request, res: Response) => {
  try {
    const { lotteryCode } = req.params;
    
    if (!lotteryCode) {
      return res.status(400).json({
        status: 'error',
        message: '彩种代码不能为空'
      });
    }

    const query = `
      SELECT 
        i.id, i.issue_no, i.start_time, i.end_time, i.draw_time, i.status,
        lt.name as lottery_name, lt.draw_interval
      FROM lottery_issues i
      JOIN lottery_types lt ON i.lottery_type_id = lt.id
      WHERE lt.code = $1 AND i.status = $2
      ORDER BY i.draw_time ASC
      LIMIT 1
    `;

    const result = await pool.query(query, [lotteryCode, 'pending']);

    if (result.rows.length === 0) {
      return res.json({
        status: 'success',
        message: '暂无可投注期号',
        data: null
      });
    }

    const issue = result.rows[0];
    const now = new Date();
    const drawTime = new Date(issue.draw_time);
    const timeRemaining = Math.max(0, Math.floor((drawTime.getTime() - now.getTime()) / 1000));

    return res.json({
      status: 'success',
      message: '获取当前期号成功',
      data: {
        ...issue,
        time_remaining: timeRemaining,
        countdown: {
          minutes: Math.floor(timeRemaining / 60),
          seconds: timeRemaining % 60
        }
      }
    });
  } catch (error: any) {
    console.error('获取当前期号失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取当前期号失败',
      error: error.message
    });
  }
};

// 获取彩种列表（用户端）
export const getUserLotteryTypes = async (req: Request, res: Response) => {
  try {
    const query = `
      SELECT 
        id, name, code, category, description, draw_interval,
        start_time, end_time
      FROM lottery_types 
      WHERE status = $1
      ORDER BY created_at ASC
    `;

    const result = await pool.query(query, ['active']);

    return res.json({
      status: 'success',
      message: '获取彩种列表成功',
      data: result.rows
    });
  } catch (error: any) {
    console.error('获取彩种列表失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取彩种列表失败',
      error: error.message
    });
  }
};
