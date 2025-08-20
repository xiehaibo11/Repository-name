import { Request, Response } from 'express';
import { LotteryService } from '../services/lotteryService';
import { pool } from '../db';

const lotteryService = new LotteryService(pool);

// 彩种管理
export const getLotteryTypes = async (req: Request, res: Response) => {
  try {
    const filters = {
      name: req.query.name as string,
      status: req.query.status as string,
      category: req.query.category as string,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20
    };

    const result = await lotteryService.getLotteryTypes(filters);

    return res.json({
      status: 'success',
      message: '获取彩种列表成功',
      data: result.data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total
      }
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

export const getLotteryTypeById = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) {
      return res.status(400).json({
        status: 'error',
        message: '无效的彩种ID'
      });
    }

    const lotteryType = await lotteryService.getLotteryTypeById(id);

    if (!lotteryType) {
      return res.status(404).json({
        status: 'error',
        message: '彩种不存在'
      });
    }

    // 调试输出
    console.log('获取到的彩种数据:', JSON.stringify(lotteryType, null, 2));

    return res.json({
      status: 'success',
      message: '获取彩种详情成功',
      data: lotteryType
    });
  } catch (error: any) {
    console.error('获取彩种详情失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '获取彩种详情失败',
      error: error.message
    });
  }
};

export const createLotteryType = async (req: Request, res: Response) => {
  try {
    const lotteryType = await lotteryService.createLotteryType(req.body);

    return res.json({
      status: 'success',
      message: '创建彩种成功',
      data: lotteryType
    });
  } catch (error: any) {
    console.error('创建彩种失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '创建彩种失败',
      error: error.message
    });
  }
};

export const updateLotteryType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const lotteryType = await lotteryService.updateLotteryType(id, req.body);

    if (!lotteryType) {
      return res.status(404).json({
        status: 'error',
        message: '彩种不存在'
      });
    }

    return res.json({
      status: 'success',
      message: '更新彩种成功',
      data: lotteryType
    });
  } catch (error: any) {
    console.error('更新彩种失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '更新彩种失败',
      error: error.message
    });
  }
};

export const deleteLotteryType = async (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await lotteryService.deleteLotteryType(id);

    if (!success) {
      return res.status(404).json({
        status: 'error',
        message: '彩种不存在'
      });
    }

    return res.json({
      status: 'success',
      message: '删除彩种成功'
    });
  } catch (error: any) {
    console.error('删除彩种失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '删除彩种失败',
      error: error.message
    });
  }
};

// 奖期管理
// 获取奖期列表
export const getIssues = async (req: Request, res: Response) => {
  try {

    const {
      lottery_type_id,
      issue_no,
      status,
      start_date,
      end_date,
      page = 1,
      pageSize = 20
    } = req.query;

    let whereConditions = [];
    let queryParams: any[] = [];
    let paramIndex = 1;

    // 构建查询条件
    if (lottery_type_id) {
      whereConditions.push(`i.lottery_type_id = $${paramIndex}`);
      queryParams.push(lottery_type_id);
      paramIndex++;
    }

    if (issue_no) {
      whereConditions.push(`i.issue_no ILIKE $${paramIndex}`);
      queryParams.push(`%${issue_no}%`);
      paramIndex++;
    }

    if (status) {
      whereConditions.push(`i.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (start_date) {
      whereConditions.push(`i.issue_date >= $${paramIndex}`);
      queryParams.push(start_date);
      paramIndex++;
    }

    if (end_date) {
      whereConditions.push(`i.issue_date <= $${paramIndex}`);
      queryParams.push(end_date);
      paramIndex++;
    }

    // 简化逻辑，只返回当前期号，不需要复杂的分页和计数

    // 查询数据 - 根据pageSize返回对应期数，按时间倒序排列
    const limit = parseInt(pageSize as string) || 1;
    const dataQuery = `
      SELECT
        i.*,
        lt.name as lottery_name,
        ld.draw_numbers,
        ld.draw_method,
        0 as bet_count,
        0 as bet_amount,
        0 as win_amount,
        CASE
          WHEN ld.draw_numbers IS NOT NULL THEN 'completed'
          ELSE 'pending'
        END as settlement_status
      FROM lottery_issues i
      JOIN lottery_types lt ON i.lottery_type_id = lt.id
      LEFT JOIN lottery_draws ld ON i.id = ld.issue_id
      WHERE i.lottery_type_id = (SELECT id FROM lottery_types WHERE code = 'ssc')
      ORDER BY i.issue_date DESC, i.issue_index DESC
      LIMIT $${paramIndex}
    `;

    queryParams.push(limit);

    const result = await pool.query(dataQuery, queryParams);

    return res.json({
      status: 'success',
      message: `获取期号成功，共${result.rows.length}期`,
      data: result.rows,
      pagination: {
        page: parseInt(page as string) || 1,
        pageSize: limit,
        total: result.rows.length
      }
    });
  } catch (error: any) {
    console.error('获取奖期列表失败:', error);
    console.error('错误详情:', error.stack);
    return res.status(500).json({
      status: 'error',
      message: '获取奖期列表失败',
      error: error.message
    });
  }
};

export const generateIssues = async (req: Request, res: Response) => {
  try {
    const { lottery_type_id, specific_time } = req.body;

    if (!lottery_type_id || !specific_time) {
      return res.status(400).json({
        status: 'error',
        message: '参数不完整，需要彩种ID和具体时间'
      });
    }

    // 只支持生成特定时间的单期期号
    const specificTime = new Date(specific_time);
    const issue = await lotteryService.generateSpecificIssue(lottery_type_id, specificTime);

    return res.json({
      status: 'success',
      message: '成功生成期号',
      data: [issue]
    });
  } catch (error: any) {
    console.error('生成期号失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '生成期号失败',
      error: error.message
    });
  }
};

// 开奖管理
export const manualDraw = async (req: Request & { user?: any }, res: Response) => {
  try {
    const { issueId, numbers } = req.body;
    const operatorId = req.user?.id;
    
    if (!issueId) {
      return res.status(400).json({
        status: 'error',
        message: '奖期ID不能为空'
      });
    }

    const drawResult = await lotteryService.manualDraw(issueId, numbers, operatorId);

    return res.json({
      status: 'success',
      message: '开奖成功',
      data: drawResult
    });
  } catch (error: any) {
    console.error('手动开奖失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '手动开奖失败',
      error: error.message
    });
  }
};

// 获取开奖历史
export const getDrawHistory = async (req: Request, res: Response) => {
  try {
    const filters = {
      lottery_type_id: req.query.lotteryTypeId ? parseInt(req.query.lotteryTypeId as string) : undefined,
      issue_no: req.query.issueNo as string,
      draw_status: req.query.drawStatus as string,
      date_range: req.query.dateRange ? JSON.parse(req.query.dateRange as string) : undefined,
      page: parseInt(req.query.page as string) || 1,
      pageSize: parseInt(req.query.pageSize as string) || 20
    };

    const result = await lotteryService.getDrawHistory(filters);

    return res.json({
      status: 'success',
      message: '获取开奖历史成功',
      data: result.data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: result.total
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

// 清理历史记录
export const cleanupHistory = async (req: Request, res: Response) => {
  try {
    const result = await lotteryService.cleanupHistoryRecords();

    return res.json({
      status: 'success',
      message: '清理历史记录成功',
      data: result
    });
  } catch (error: any) {
    console.error('清理历史记录失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '清理历史记录失败',
      error: error.message
    });
  }
};

// 初始化彩票系统
export const initLotterySystem = async (req: Request, res: Response) => {
  try {
    // 创建清理函数
    await lotteryService.createCleanupFunction();

    // 启动定时任务
    await lotteryService.startScheduler();

    return res.json({
      status: 'success',
      message: '彩票系统初始化成功'
    });
  } catch (error: any) {
    console.error('彩票系统初始化失败:', error);
    return res.status(500).json({
      status: 'error',
      message: '彩票系统初始化失败',
      error: error.message
    });
  }
};


