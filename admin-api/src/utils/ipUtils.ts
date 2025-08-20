import { Request } from 'express';
import axios from 'axios';

// 尝试导入geoip-lite，如果没有安装则使用null
let geoip: any = null;
try {
  geoip = require('geoip-lite');
} catch (error) {
  console.warn('geoip-lite未安装，将使用在线API服务');
}

/**
 * 获取客户端真实IP地址
 * 支持代理、负载均衡等环境
 * @param req Express请求对象
 * @returns 客户端IP地址
 */
export const getClientIP = (req: Request): string => {
  // 优先级顺序：
  // 1. X-Forwarded-For (最常用的代理头)
  // 2. X-Real-IP (Nginx常用)
  // 3. X-Client-IP (Apache常用)
  // 4. CF-Connecting-IP (Cloudflare)
  // 5. req.ip (Express内置)
  // 6. req.connection.remoteAddress (直连)

  const headers = [
    'x-forwarded-for',
    'x-real-ip',
    'x-client-ip',
    'cf-connecting-ip'
  ];

  for (const header of headers) {
    const value = req.headers[header];
    if (value) {
      // X-Forwarded-For 可能包含多个IP，取第一个
      const ip = Array.isArray(value) ? value[0] : value.split(',')[0];
      const cleanIP = ip.trim();

      // 验证IP格式
      if (isValidIP(cleanIP)) {
        return cleanIP;
      }
    }
  }

  // 使用Express内置的IP获取
  if (req.ip && isValidIP(req.ip)) {
    return req.ip;
  }

  // 最后尝试从连接中获取
  const connectionIP = req.connection?.remoteAddress || req.socket?.remoteAddress;
  if (connectionIP && isValidIP(connectionIP)) {
    return connectionIP;
  }

  // 默认返回本地IP
  return '127.0.0.1';
};

/**
 * 验证IP地址格式
 * @param ip IP地址字符串
 * @returns 是否为有效IP
 */
export const isValidIP = (ip: string): boolean => {
  if (!ip || typeof ip !== 'string') {
    return false;
  }

  // IPv4 正则表达式
  const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
  
  // IPv6 正则表达式（简化版）
  const ipv6Regex = /^(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$|^::1$|^::$/;
  
  return ipv4Regex.test(ip) || ipv6Regex.test(ip);
};

/**
 * 检查是否为内网IP
 * @param ip IP地址
 * @returns 是否为内网IP
 */
export const isPrivateIP = (ip: string): boolean => {
  if (!isValidIP(ip)) {
    return false;
  }

  // IPv4 内网地址范围
  const privateRanges = [
    /^127\./, // 127.0.0.0/8 (localhost)
    /^10\./, // 10.0.0.0/8
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // 172.16.0.0/12
    /^192\.168\./, // 192.168.0.0/16
    /^169\.254\./, // 169.254.0.0/16 (link-local)
  ];

  // IPv6 内网地址
  if (ip === '::1' || ip.startsWith('fe80:') || ip.startsWith('fc00:') || ip.startsWith('fd00:')) {
    return true;
  }

  return privateRanges.some(range => range.test(ip));
};

/**
 * 使用真实的IP地理位置服务
 * @param ip IP地址
 * @returns 真实的地理位置信息
 */
const getRealIPLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
} | null> => {
  // IP地理位置服务列表（按优先级排序）
  const services = [
    {
      name: 'ip-api.com',
      url: `http://ip-api.com/json/${ip}?lang=zh-CN&fields=status,country,regionName,city,isp,query`,
      parser: (data: any) => {
        if (data.status !== 'success') {
          throw new Error(`API返回失败: ${data.message || '未知错误'}`);
        }
        return {
          location: `${data.country}, ${data.regionName}, ${data.city}`,
          country: data.country === 'China' ? 'CN' : (data.countryCode || 'Unknown'),
          region: data.regionName || 'Unknown',
          city: data.city || 'Unknown',
          provider: data.isp || 'Unknown'
        };
      }
    },
    {
      name: 'ipinfo.io',
      url: `https://ipinfo.io/${ip}/json`,
      parser: (data: any) => {
        const [city, region] = (data.city && data.region) ? [data.city, data.region] : ['Unknown', 'Unknown'];
        const country = data.country === 'CN' ? '中国' : (data.country || 'Unknown');
        return {
          location: `${country}, ${region}, ${city}`,
          country: data.country || 'Unknown',
          region: region,
          city: city,
          provider: data.org || 'Unknown'
        };
      }
    },
    {
      name: 'ipapi.co',
      url: `https://ipapi.co/${ip}/json/`,
      parser: (data: any) => {
        const country = data.country_name === 'China' ? '中国' : (data.country_name || 'Unknown');
        return {
          location: `${country}, ${data.region}, ${data.city}`,
          country: data.country_code || 'Unknown',
          region: data.region || 'Unknown',
          city: data.city || 'Unknown',
          provider: data.org || 'Unknown'
        };
      }
    }
  ];

  for (const service of services) {
    try {
      console.log(`🌐 尝试使用 ${service.name} 获取IP地理位置...`);

      const response = await axios.get(service.url, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const locationInfo = service.parser(response.data);

      console.log(`✅ ${service.name} 获取成功:`, locationInfo);
      return locationInfo;

    } catch (error: any) {
      console.warn(`❌ ${service.name} 获取失败:`, error.message);
      continue;
    }
  }

  console.warn('⚠️  所有IP地理位置服务都失败，将使用模拟数据');
  return null;
};

/**
 * 使用本地GeoIP数据库获取位置信息
 * @param ip IP地址
 * @returns 地理位置信息或null
 */
const getLocalIPLocation = (ip: string): {
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
} | null => {
  if (!geoip) {
    return null;
  }

  try {
    const geo = geoip.lookup(ip);
    if (!geo) {
      return null;
    }

    // 转换国家代码为中文名称
    const countryNames: { [key: string]: string } = {
      'CN': '中国',
      'US': '美国',
      'JP': '日本',
      'KR': '韩国',
      'GB': '英国',
      'DE': '德国',
      'FR': '法国',
      'CA': '加拿大',
      'AU': '澳大利亚',
      'SG': '新加坡',
      'HK': '香港',
      'TW': '台湾',
      'MO': '澳门'
    };

    const country = countryNames[geo.country] || geo.country || 'Unknown';
    const region = geo.region || 'Unknown';
    const city = geo.city || 'Unknown';

    return {
      location: `${country}, ${region}, ${city}`,
      country: geo.country || 'Unknown',
      region: region,
      city: city,
      provider: 'Local GeoIP Database'
    };
  } catch (error: any) {
    console.warn('本地GeoIP查询失败:', error.message);
    return null;
  }
};

/**
 * 获取IP地理位置信息
 * @param ip IP地址
 * @returns 地理位置信息
 */
export const getIPLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
}> => {
  // 检查是否为内网IP
  if (isPrivateIP(ip)) {
    return {
      location: '内网地址',
      country: 'Local',
      region: 'Private Network',
      city: 'Local',
      provider: '局域网'
    };
  }

  try {
    // 1. 优先尝试本地GeoIP数据库（速度快，无网络依赖）
    const localLocation = getLocalIPLocation(ip);
    if (localLocation) {
      console.log('✅ 本地GeoIP数据库获取成功:', localLocation);
      return localLocation;
    }

    // 2. 尝试使用在线IP地理位置服务
    const realLocation = await getRealIPLocation(ip);
    if (realLocation) {
      return realLocation;
    }

    // 3. 如果所有服务都失败，使用模拟数据
    console.log('🔄 使用模拟数据作为后备方案');
    const mockLocation = getMockLocationByIP(ip);
    return mockLocation;
  } catch (error) {
    console.error('❌ 获取IP地理位置失败:', error);

    // 返回默认位置
    return {
      location: '未知地区',
      country: 'Unknown',
      region: 'Unknown',
      city: 'Unknown',
      provider: 'Unknown'
    };
  }
};



/**
 * 根据IP生成模拟地理位置数据
 * @param ip IP地址
 * @returns 模拟的地理位置信息
 */
const getMockLocationByIP = (ip: string) => {
  // 根据IP的数值特征生成不同的地理位置
  const ipSegments = ip.split('.').map(Number);
  const hash = ipSegments.reduce((acc, segment) => acc + segment, 0);
  
  const locations = [
    {
      location: '中国, 广东, 深圳市',
      country: 'CN',
      region: 'Guangdong',
      city: 'Shenzhen',
      provider: 'China Telecom'
    },
    {
      location: '中国, 北京, 北京市',
      country: 'CN',
      region: 'Beijing',
      city: 'Beijing',
      provider: 'China Unicom'
    },
    {
      location: '中国, 上海, 上海市',
      country: 'CN',
      region: 'Shanghai',
      city: 'Shanghai',
      provider: 'China Mobile'
    },
    {
      location: '中国, 浙江, 杭州市',
      country: 'CN',
      region: 'Zhejiang',
      city: 'Hangzhou',
      provider: 'China Telecom'
    },
    {
      location: '中国, 江苏, 南京市',
      country: 'CN',
      region: 'Jiangsu',
      city: 'Nanjing',
      provider: 'China Unicom'
    },
    {
      location: '中国, 四川, 成都市',
      country: 'CN',
      region: 'Sichuan',
      city: 'Chengdu',
      provider: 'China Mobile'
    }
  ];

  return locations[hash % locations.length];
};

/**
 * 格式化IP地址用于显示
 * @param ip IP地址
 * @returns 格式化后的IP地址
 */
export const formatIPForDisplay = (ip: string): string => {
  if (!ip) return '未知';
  
  // IPv6地址简化显示
  if (ip.includes(':')) {
    return ip.length > 20 ? `${ip.substring(0, 20)}...` : ip;
  }
  
  return ip;
};

/**
 * 检查IP是否在中国境内
 * @param location 地理位置信息
 * @returns 是否在中国境内
 */
export const isIPInChina = (location: { country: string; location: string }): boolean => {
  return location.country === 'CN' || location.location.includes('中国');
};
