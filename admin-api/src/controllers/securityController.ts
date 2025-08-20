import { Request, Response } from 'express';

// IP安全检查数据接口
interface IPSecurityData {
  ip: string;
  securityScore: number;
  starRating: number;
  location: string;
  provider: string;
  riskFactors: string[];
  checkTime: string;
  recommendation: string;
}

// 模拟IP地理位置数据库
const getLocationInfo = (ip: string) => {
  // 检查是否为内网IP
  if (ip.startsWith('192.168.') || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return {
      location: '内网地址',
      provider: '局域网',
      country: 'Local',
      region: 'Private Network'
    };
  }

  // 模拟不同地区的IP信息
  const ipSegments = ip.split('.').map(Number);
  const hash = ipSegments.reduce((acc, segment) => acc + segment, 0);
  
  const locations = [
    { location: '中国, 广东, 深圳市', provider: 'China Telecom', country: 'CN', region: 'Guangdong' },
    { location: '中国, 北京, 北京市', provider: 'China Unicom', country: 'CN', region: 'Beijing' },
    { location: '中国, 上海, 上海市', provider: 'China Mobile', country: 'CN', region: 'Shanghai' },
    { location: '中国, 浙江, 杭州市', provider: 'China Telecom', country: 'CN', region: 'Zhejiang' },
    { location: '中国, 江苏, 南京市', provider: 'China Unicom', country: 'CN', region: 'Jiangsu' }
  ];

  return locations[hash % locations.length];
};

// 计算安全评分
const calculateSecurityScore = (ip: string): { score: number; riskFactors: string[] } => {
  const riskFactors: string[] = [];
  let score = 100;

  // 检查是否为内网IP（内网IP安全性较高）
  if (ip.startsWith('192.168.') || ip.startsWith('127.') || ip.startsWith('10.') || ip.startsWith('172.')) {
    return { score: 95, riskFactors: [] };
  }

  // 基于IP地址特征进行风险评估
  const ipSegments = ip.split('.').map(Number);
  
  // 模拟一些风险检查
  if (ipSegments[0] === 0 || ipSegments[0] >= 224) {
    riskFactors.push('特殊IP地址段');
    score -= 20;
  }

  // 根据IP的最后一段数字模拟不同的风险等级
  const lastSegment = ipSegments[3];
  
  if (lastSegment < 50) {
    // 低风险
    score = Math.max(score - 5, 80);
  } else if (lastSegment < 150) {
    // 中等风险
    score = Math.max(score - 15, 60);
    if (lastSegment % 10 === 0) {
      riskFactors.push('可疑IP模式');
    }
  } else {
    // 高风险
    score = Math.max(score - 30, 40);
    riskFactors.push('高风险IP段');
  }

  // 随机添加一些风险因素（用于演示）
  if (lastSegment % 7 === 0) {
    riskFactors.push('频繁访问记录');
    score -= 10;
  }

  if (lastSegment % 13 === 0) {
    riskFactors.push('异常访问模式');
    score -= 15;
  }

  return { score: Math.max(score, 20), riskFactors };
};

// 获取安全建议
const getSecurityRecommendation = (score: number): string => {
  if (score >= 90) return '安全';
  if (score >= 80) return '良好';
  if (score >= 70) return '需要关注';
  if (score >= 60) return '建议提升安全等级';
  if (score >= 40) return '存在安全风险';
  return '高风险，建议立即处理';
};

/**
 * 公开IP安全检查接口（无需认证）
 * @param req 请求对象
 * @param res 响应对象
 */
export const checkPublicIPSecurity = async (req: Request, res: Response) => {
  try {
    const { ip } = req.query;

    if (!ip || typeof ip !== 'string') {
      return res.status(400).json({
        status: 'error',
        message: 'IP地址参数缺失或无效',
        code: 'INVALID_IP'
      });
    }

    // 验证IP地址格式
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    if (!ipRegex.test(ip)) {
      return res.status(400).json({
        status: 'error',
        message: 'IP地址格式无效',
        code: 'INVALID_IP_FORMAT'
      });
    }

    // 获取位置信息
    const locationInfo = getLocationInfo(ip);
    
    // 计算安全评分
    const { score, riskFactors } = calculateSecurityScore(ip);
    
    // 计算星级评分（1-5星）
    const starRating = Math.ceil(score / 20);
    
    // 获取安全建议
    const recommendation = getSecurityRecommendation(score);

    const securityData: IPSecurityData = {
      ip,
      securityScore: score,
      starRating,
      location: locationInfo.location,
      provider: locationInfo.provider,
      riskFactors,
      checkTime: new Date().toISOString(),
      recommendation
    };

    res.status(200).json({
      status: 'success',
      message: 'IP安全检查完成',
      data: securityData
    });

  } catch (error) {
    console.error('IP安全检查错误:', error);
    res.status(500).json({
      status: 'error',
      message: '安全检查服务暂时不可用',
      code: 'SECURITY_CHECK_ERROR'
    });
  }
};

/**
 * 管理员IP安全检查接口（需要认证）
 * @param req 请求对象
 * @param res 响应对象
 */
export const checkIPSecurity = async (req: Request, res: Response) => {
  // 复用公开接口的逻辑，但可以添加更多管理员专用功能
  return checkPublicIPSecurity(req, res);
};

/**
 * 批量IP安全检查（管理员专用）
 * @param req 请求对象
 * @param res 响应对象
 */
export const batchCheckIPSecurity = async (req: Request, res: Response) => {
  try {
    const { ips } = req.body;

    if (!Array.isArray(ips) || ips.length === 0) {
      return res.status(400).json({
        status: 'error',
        message: 'IP地址列表无效',
        code: 'INVALID_IP_LIST'
      });
    }

    if (ips.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: '批量检查IP数量不能超过100个',
        code: 'TOO_MANY_IPS'
      });
    }

    const results: IPSecurityData[] = [];
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;

    for (const ip of ips) {
      if (typeof ip !== 'string' || !ipRegex.test(ip)) {
        continue; // 跳过无效IP
      }

      const locationInfo = getLocationInfo(ip);
      const { score, riskFactors } = calculateSecurityScore(ip);
      const starRating = Math.ceil(score / 20);
      const recommendation = getSecurityRecommendation(score);

      results.push({
        ip,
        securityScore: score,
        starRating,
        location: locationInfo.location,
        provider: locationInfo.provider,
        riskFactors,
        checkTime: new Date().toISOString(),
        recommendation
      });
    }

    res.status(200).json({
      status: 'success',
      message: `批量检查完成，共处理${results.length}个IP`,
      data: results
    });

  } catch (error) {
    console.error('批量IP安全检查错误:', error);
    res.status(500).json({
      status: 'error',
      message: '批量安全检查服务暂时不可用',
      code: 'BATCH_SECURITY_CHECK_ERROR'
    });
  }
};
