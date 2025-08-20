import { Request, Response } from 'express';
import LoginLogService from '../services/loginLogService';
import LoginLog from '../models/LoginLog';

/**
 * 获取用户登录历史
 */
export const getUserLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.params;
    const { page = 1, pageSize = 20, status } = req.query;

    // 验证参数
    if (!userId || !userType) {
      res.status(400).json({
        status: 'error',
        message: '缺少必要参数',
        code: 'MISSING_PARAMS'
      });
      return;
    }

    if (!['member', 'agent', 'admin'].includes(userType as string)) {
      res.status(400).json({
        status: 'error',
        message: '无效的用户类型',
        code: 'INVALID_USER_TYPE'
      });
      return;
    }

    const result = await LoginLogService.getUserLoginHistory(
      parseInt(userId as string),
      userType as 'member' | 'agent' | 'admin',
      {
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        status: status as 'success' | 'failed' | undefined
      }
    );

    res.status(200).json({
      status: 'success',
      message: '获取登录历史成功',
      data: result
    });
  } catch (error) {
    console.error('获取用户登录历史失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 获取IP地址登录历史
 */
export const getIpLoginHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ip } = req.params;
    const { page = 1, pageSize = 20, days = 30 } = req.query;

    if (!ip) {
      res.status(400).json({
        status: 'error',
        message: '缺少IP地址参数',
        code: 'MISSING_IP'
      });
      return;
    }

    const result = await LoginLogService.getIpLoginHistory(ip, {
      page: parseInt(page as string),
      pageSize: parseInt(pageSize as string),
      days: parseInt(days as string)
    });

    res.status(200).json({
      status: 'success',
      message: '获取IP登录历史成功',
      data: result
    });
  } catch (error) {
    console.error('获取IP登录历史失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 获取用户登录统计信息
 */
export const getUserLoginStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType } = req.params;
    const { days = 30 } = req.query;

    if (!userId || !userType) {
      res.status(400).json({
        status: 'error',
        message: '缺少必要参数',
        code: 'MISSING_PARAMS'
      });
      return;
    }

    if (!['member', 'agent', 'admin'].includes(userType as string)) {
      res.status(400).json({
        status: 'error',
        message: '无效的用户类型',
        code: 'INVALID_USER_TYPE'
      });
      return;
    }

    const stats = await LoginLogService.getUserLoginStats(
      parseInt(userId as string),
      userType as 'member' | 'agent' | 'admin',
      parseInt(days as string)
    );

    res.status(200).json({
      status: 'success',
      message: '获取登录统计成功',
      data: stats
    });
  } catch (error) {
    console.error('获取用户登录统计失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 获取当前用户的安全信息（最后登录信息）
 */
export const getCurrentUserSecurityInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    // 从认证中间件获取用户信息
    const user = (req as any).user;

    if (!user) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHORIZED'
      });
      return;
    }

    // 确定用户类型
    let userType: 'member' | 'agent' | 'admin' = 'member';
    if (user.role === 'admin' || user.role === 'super_admin') {
      userType = 'admin';
    } else if (user.role === 'agent') {
      userType = 'agent';
    }

    // 获取最近的登录统计
    const stats = await LoginLogService.getUserLoginStats(user.id, userType, 1);

    // 格式化响应数据
    const securityInfo = {
      last_login_ip: stats.lastLoginIp || '未知',
      last_login_region: stats.lastLoginLocation || '未知地区',
      last_login_time: stats.lastLoginTime ?
        new Date(stats.lastLoginTime).toLocaleString('zh-CN', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false
        }).replace(/\//g, '/') : '未知时间'
    };

    res.status(200).json({
      status: 'success',
      message: '获取安全信息成功',
      data: securityInfo
    });
  } catch (error) {
    console.error('获取当前用户安全信息失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 检查可疑登录活动
 */
export const checkSuspiciousActivity = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, userType, currentIp } = req.body;

    if (!userId || !userType || !currentIp) {
      res.status(400).json({
        status: 'error',
        message: '缺少必要参数',
        code: 'MISSING_PARAMS'
      });
      return;
    }

    const result = await LoginLogService.checkSuspiciousActivity(
      parseInt(userId),
      userType,
      currentIp
    );

    res.status(200).json({
      status: 'success',
      message: '可疑活动检查完成',
      data: result
    });
  } catch (error) {
    console.error('检查可疑登录活动失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

/**
 * 获取登录日志列表（管理员用）
 */
export const getLoginLogs = async (req: Request, res: Response): Promise<void> => {
  try {
    const { 
      page = 1, 
      pageSize = 20, 
      userType, 
      status, 
      startDate, 
      endDate,
      ip,
      username 
    } = req.query;

    const offset = (parseInt(page as string) - 1) * parseInt(pageSize as string);
    const limit = parseInt(pageSize as string);

    // 构建查询条件
    const whereClause: any = {};
    
    if (userType) {
      whereClause.userType = userType;
    }
    
    if (status) {
      whereClause.loginStatus = status;
    }
    
    if (ip) {
      whereClause.loginIp = ip;
    }
    
    if (username) {
      whereClause.username = {
        [require('sequelize').Op.iLike]: `%${username}%`
      };
    }
    
    if (startDate && endDate) {
      whereClause.loginTime = {
        [require('sequelize').Op.between]: [new Date(startDate as string), new Date(endDate as string)]
      };
    }

    const { count, rows } = await LoginLog.findAndCountAll({
      where: whereClause,
      order: [['loginTime', 'DESC']],
      limit,
      offset
    });

    res.status(200).json({
      status: 'success',
      message: '获取登录日志成功',
      data: {
        logs: rows.map(log => log.toSafeJSON()),
        total: count,
        page: parseInt(page as string),
        pageSize: parseInt(pageSize as string),
        totalPages: Math.ceil(count / parseInt(pageSize as string))
      }
    });
  } catch (error) {
    console.error('获取登录日志失败:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
