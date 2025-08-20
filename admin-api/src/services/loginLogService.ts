import { Request } from 'express';
import LoginLog from '../models/LoginLog';
import { getClientIP, getIPLocation } from '../utils/geoipUtils';

/**
 * 登录日志服务
 */
export class LoginLogService {
  /**
   * 记录登录成功日志
   */
  static async recordSuccessLogin(
    req: Request,
    user: {
      id: number;
      username: string;
      type: 'member' | 'agent' | 'admin';
    }
  ): Promise<LoginLog> {
    try {
      // 获取客户端IP地址
      const clientIP = await getClientIP(req);
      
      // 获取用户代理字符串
      const userAgent = req.headers['user-agent'] || '';
      
      // 获取IP地理位置信息
      let locationInfo;
      try {
        locationInfo = await getIPLocation(clientIP);
      } catch (error) {
        console.error('获取IP地理位置失败:', error);
        locationInfo = {
          location: '未知地区',
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          provider: 'Unknown'
        };
      }

      // 创建登录成功日志
      const loginLog = await LoginLog.createSuccessLog({
        userId: user.id,
        userType: user.type,
        username: user.username,
        loginIp: clientIP,
        loginLocation: locationInfo.location,
        country: locationInfo.country,
        region: locationInfo.region,
        city: locationInfo.city,
        isp: locationInfo.provider,
        userAgent: userAgent
      });

      console.log(`✅ 记录登录成功日志: ${user.type} ${user.username} from ${clientIP} (${locationInfo.location})`);
      
      return loginLog;
    } catch (error) {
      console.error('记录登录成功日志失败:', error);
      throw error;
    }
  }

  /**
   * 记录登录失败日志
   */
  static async recordFailureLogin(
    req: Request,
    data: {
      username: string;
      userType: 'member' | 'agent' | 'admin';
      failureReason: string;
      userId?: number;
    }
  ): Promise<LoginLog> {
    try {
      // 获取客户端IP地址
      const clientIP = await getClientIP(req);

      // 获取用户代理字符串
      const userAgent = req.headers['user-agent'] || '';

      // 获取IP地理位置信息
      let locationInfo;
      try {
        locationInfo = await getIPLocation(clientIP);
      } catch (error) {
        console.error('获取IP地理位置失败:', error);
        locationInfo = {
          location: '未知地区',
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          provider: 'Unknown'
        };
      }

      // 创建登录失败日志
      const loginLog = await LoginLog.createFailureLog({
        userId: data.userId,
        userType: data.userType,
        username: data.username,
        loginIp: clientIP,
        loginLocation: locationInfo.location,
        country: locationInfo.country,
        region: locationInfo.region,
        city: locationInfo.city,
        isp: locationInfo.provider,
        userAgent: userAgent,
        failureReason: data.failureReason
      });

      console.log(`❌ 记录登录失败日志: ${data.userType} ${data.username} from ${clientIP} - ${data.failureReason}`);
      
      return loginLog;
    } catch (error) {
      console.error('记录登录失败日志失败:', error);
      throw error;
    }
  }

  /**
   * 获取用户登录历史
   */
  static async getUserLoginHistory(
    userId: number,
    userType: 'member' | 'agent' | 'admin',
    options: {
      page?: number;
      pageSize?: number;
      status?: 'success' | 'failed';
    } = {}
  ): Promise<{
    logs: LoginLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, status } = options;
    const offset = (page - 1) * pageSize;

    const result = await LoginLog.getUserLoginHistory(userId, userType, {
      limit: pageSize,
      offset,
      status
    });

    return {
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    };
  }

  /**
   * 获取IP地址登录历史
   */
  static async getIpLoginHistory(
    loginIp: string,
    options: {
      page?: number;
      pageSize?: number;
      days?: number;
    } = {}
  ): Promise<{
    logs: LoginLog[];
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  }> {
    const { page = 1, pageSize = 20, days = 30 } = options;
    const offset = (page - 1) * pageSize;

    const result = await LoginLog.getIpLoginHistory(loginIp, {
      limit: pageSize,
      offset,
      days
    });

    return {
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
      totalPages: Math.ceil(result.total / pageSize)
    };
  }

  /**
   * 获取用户登录统计信息
   */
  static async getUserLoginStats(
    userId: number,
    userType: 'member' | 'agent' | 'admin',
    days: number = 30
  ): Promise<{
    totalLogins: number;
    successLogins: number;
    failedLogins: number;
    successRate: number;
    uniqueIps: number;
    lastLoginTime?: Date;
    lastLoginIp?: string;
    lastLoginLocation?: string;
  }> {
    const stats = await LoginLog.getLoginStats(userId, userType, days);
    
    const successRate = stats.totalLogins > 0 
      ? Math.round((stats.successLogins / stats.totalLogins) * 100) 
      : 0;

    return {
      ...stats,
      successRate
    };
  }

  /**
   * 检查可疑登录活动
   */
  static async checkSuspiciousActivity(
    userId: number,
    userType: 'member' | 'agent' | 'admin',
    currentIp: string
  ): Promise<{
    isSuspicious: boolean;
    reasons: string[];
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    const reasons: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    try {
      // 获取最近7天的登录记录
      const recentLogs = await LoginLog.getUserLoginHistory(userId, userType, {
        limit: 50,
        offset: 0
      });

      if (recentLogs.logs.length === 0) {
        return { isSuspicious: false, reasons, riskLevel };
      }

      // 检查1: 新IP地址登录
      const recentIps = recentLogs.logs
        .filter(log => log.loginStatus === 'success')
        .map(log => log.loginIp)
        .slice(0, 10); // 最近10次成功登录的IP

      if (!recentIps.includes(currentIp)) {
        reasons.push('使用新的IP地址登录');
        riskLevel = 'medium';
      }

      // 检查2: 频繁登录失败
      const recentFailures = recentLogs.logs
        .filter(log => log.loginStatus === 'failed')
        .filter(log => {
          const timeDiff = Date.now() - new Date(log.loginTime).getTime();
          return timeDiff < 24 * 60 * 60 * 1000; // 24小时内
        });

      if (recentFailures.length >= 5) {
        reasons.push('24小时内多次登录失败');
        riskLevel = 'high';
      }

      // 检查3: 异常登录时间
      const currentHour = new Date().getHours();
      if (currentHour >= 2 && currentHour <= 6) {
        reasons.push('在异常时间段登录 (凌晨2-6点)');
        if (riskLevel === 'low') riskLevel = 'medium';
      }

      // 检查4: 地理位置异常
      const lastSuccessLog = recentLogs.logs.find(log => log.loginStatus === 'success');
      if (lastSuccessLog && lastSuccessLog.country) {
        // 这里可以添加地理位置检查逻辑
        // 比如检查是否从不同国家登录
      }

      return {
        isSuspicious: reasons.length > 0,
        reasons,
        riskLevel
      };
    } catch (error) {
      console.error('检查可疑登录活动失败:', error);
      return { isSuspicious: false, reasons: [], riskLevel: 'low' };
    }
  }
}

export default LoginLogService;
