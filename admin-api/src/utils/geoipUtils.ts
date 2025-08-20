import { Request } from 'express';
import path from 'path';

// 只使用百度IP地理位置API，删除其他不准确的服务

/**
 * 获取客户端真实IP地址
 * 支持代理、负载均衡等环境
 */
export const getClientIP = async (req: Request): Promise<string> => {
  // 优先级顺序：
  // 1. X-Forwarded-For (最常用的代理头)
  // 2. X-Real-IP (Nginx常用)
  // 3. X-Client-IP (Apache常用)
  // 4. CF-Connecting-IP (Cloudflare)
  // 5. req.ip (Express内置)
  // 6. req.socket.remoteAddress (直连)

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

      // 验证IP格式且不是内网IP
      if (isValidIP(cleanIP) && !isPrivateIP(cleanIP)) {
        return cleanIP;
      }
    }
  }

  // 使用Express内置的IP获取
  if (req.ip && isValidIP(req.ip) && !isPrivateIP(req.ip)) {
    return req.ip;
  }

  // 最后尝试从连接中获取
  const connectionIP = req.socket?.remoteAddress;
  if (connectionIP && isValidIP(connectionIP) && !isPrivateIP(connectionIP)) {
    return connectionIP;
  }

  // 如果都是内网IP，尝试通过外部服务获取真实公网IP
  console.warn('⚠️  未从请求头获取到真实公网IP，尝试通过外部服务获取');

  try {
    // 同步调用外部服务获取真实IP（注意：这是同步操作，可能影响性能）
    const realIP = await getRealPublicIP();
    console.log(`✅ 通过外部服务获取到真实公网IP: ${realIP}`);
    return realIP;
  } catch (error) {
    console.error('❌ 获取真实公网IP失败:', error);
    // 最后的备选方案：返回一个测试IP
    return '125.85.129.215';
  }
};

/**
 * 验证IP地址格式
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
 * 获取真实的公网IP地址（通过外部服务）
 */
export const getRealPublicIP = async (): Promise<string> => {
  const axios = require('axios');

  // 多个IP获取服务，提高成功率
  const ipServices = [
    'https://api.ipify.org?format=json',
    'https://httpbin.org/ip',
    'https://api.ip.sb/ip',
    'https://ipapi.co/ip/'
  ];

  for (const service of ipServices) {
    try {
      console.log(`🌐 尝试获取真实IP: ${service}`);
      const response = await axios.get(service, { timeout: 3000 });

      let ip = '';
      if (typeof response.data === 'string') {
        ip = response.data.trim();
      } else if (response.data.ip) {
        ip = response.data.ip;
      } else if (response.data.origin) {
        ip = response.data.origin;
      }

      if (ip && isValidIP(ip) && !isPrivateIP(ip)) {
        console.log(`✅ 获取到真实公网IP: ${ip}`);
        return ip;
      }
    } catch (error: any) {
      console.warn(`❌ IP服务 ${service} 失败:`, error.message);
    }
  }

  // 如果所有服务都失败，返回测试IP
  console.warn('⚠️  所有IP服务都失败，使用测试IP');
  return '125.85.129.215';
};



/**
 * 使用百度IP地理位置API获取地理位置信息（备选方案）
 * 提供多个百度接口以提高成功率
 */
export const getBaiduIPLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
} | null> => {
  const axios = require('axios');

  const ipVersion = ip.includes(':') ? 'IPv6' : 'IPv4';
  console.log(`🌐 使用百度API获取IP地理位置: ${ip} (${ipVersion})`);

  // 尝试多个百度API接口
  const baiduAPIs = [
    {
      name: '百度企服API',
      url: `https://qifu.baidu.com/ip/geo/v1/district?ip=${ip}`,
      headers: {
        'Referer': 'https://qifu.baidu.com/?activeId=SEARCH_IP_ADDRESS',
        'Host': 'qifu.baidu.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      priority: 1
    },
    {
      name: '百度地图API',
      url: `https://api.map.baidu.com/location/ip?ip=${ip}&ak=E4805d16520de693a3fe707cdc962045&coor=bd09ll`,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      priority: 2
    }
  ];

  console.log(`📋 百度API查询策略 (${ipVersion}):`);
  baiduAPIs.forEach(api => {
    console.log(`   ${api.priority}. ${api.name}`);
  });

  for (const api of baiduAPIs) {
    try {
      console.log(`🔍 尝试${api.name}获取IP地理位置...`);
      console.log(`📡 ${api.name}请求URL: ${api.url}`);

      const startTime = Date.now();
      const response = await axios.get(api.url, {
        timeout: 6000, // IPv6查询可能较慢
        headers: api.headers
      });
      const duration = Date.now() - startTime;

      console.log(`📊 ${api.name}响应状态: ${response.status} (${duration}ms)`);
      console.log(`📊 ${api.name}原始响应:`, JSON.stringify(response.data, null, 2));

      let result = null;

      // 处理百度企服API响应
      if (api.name === '百度企服API' && response.data.code === 'Success' && response.data.data) {
        const locationData = response.data.data;
        const country = locationData.country || '未知国家';
        const province = locationData.prov || '';
        const city = locationData.city || '';
        const district = locationData.district || '';
        const isp = locationData.isp || locationData.owner || '';

        console.log(`📍 百度企服API解析: 国家=${country}, 省份=${province}, 城市=${city}, 区县=${district}, ISP=${isp}`);

        // 组装完整地址
        let location = country;
        if (province) location += `, ${province}`;
        if (city && city !== province) location += `, ${city}`;
        if (district) location += `, ${district}`;

        result = {
          location,
          country: getCountryCode(country),
          region: province || '未知',
          city: city || '未知',
          provider: isp || '未知运营商'
        };
      }
      // 处理百度地图API响应
      else if (api.name === '百度地图API' && response.data.status === 0 && response.data.content) {
        const content = response.data.content;
        const address = content.address || '';
        const addressDetail = content.address_detail || {};

        const country = '中国'; // 百度地图API主要服务中国地区
        const province = addressDetail.province || '';
        const city = addressDetail.city || '';
        const district = addressDetail.district || '';

        console.log(`📍 百度地图API解析: 地址=${address}, 省份=${province}, 城市=${city}, 区县=${district}`);

        // 组装完整地址
        let location = country;
        if (province) location += `, ${province}`;
        if (city && city !== province) location += `, ${city}`;
        if (district) location += `, ${district}`;

        result = {
          location,
          country: 'CN',
          region: province || '未知',
          city: city || '未知',
          provider: '未知运营商'
        };
      } else {
        console.warn(`⚠️ ${api.name}返回数据格式异常:`, {
          hasCode: !!response.data.code,
          hasStatus: !!response.data.status,
          hasData: !!response.data.data,
          hasContent: !!response.data.content
        });
      }

      if (result) {
        console.log(`✅ ${api.name}获取成功 (${duration}ms):`, result);
        return result;
      }

    } catch (error: any) {
      if (error.message.includes('timeout')) {
        console.warn(`⏱️ ${api.name}超时 (${ipVersion}):`, error.message);
      } else if (error.message.includes('ENOTFOUND') || error.message.includes('网络')) {
        console.warn(`🌐 ${api.name}网络错误 (${ipVersion}):`, error.message);
      } else {
        console.warn(`❌ ${api.name}获取失败 (${ipVersion}):`, error.message);
      }
    }
  }

  console.warn(`❌ 所有百度API都获取失败 (${ipVersion})`);
  return null;
};

/**
 * 国家代码映射函数
 */
const getCountryCode = (country: string): string => {
  const countryMap: { [key: string]: string } = {
    '中国': 'CN',
    '美国': 'US',
    '日本': 'JP',
    '韩国': 'KR',
    '新加坡': 'SG',
    '香港': 'HK',
    '台湾': 'TW',
    '澳门': 'MO',
    '英国': 'GB',
    '德国': 'DE',
    '法国': 'FR',
    '加拿大': 'CA',
    '澳大利亚': 'AU'
  };

  return countryMap[country] || 'Unknown';
};

/**
 * 使用高德地图IP定位API获取地理位置信息（推荐）
 * 官方文档: https://lbs.amap.com/api/webservice/guide/api/ipconfig
 */
export const getAmapIPLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
} | null> => {
  const axios = require('axios');

  try {
    const ipVersion = ip.includes(':') ? 'IPv6' : 'IPv4';
    console.log(`🗺️ 使用高德地图API获取IP地理位置: ${ip} (${ipVersion})`);

    // 高德地图Web服务API Key（从环境变量获取）
    const amapKey = process.env.AMAP_API_KEY;

    if (!amapKey || amapKey === 'YOUR_AMAP_KEY_HERE') {
      console.warn('⚠️  高德地图API Key未配置，跳过高德地图API');
      console.warn('💡 请在.env文件中配置: AMAP_API_KEY=你的高德API密钥');
      throw new Error('高德地图API Key未配置');
    }

    const apiUrl = `https://restapi.amap.com/v3/ip?ip=${ip}&key=${amapKey}`;
    console.log(`📡 高德地图API请求: ${apiUrl.replace(amapKey, '***')}`); // 隐藏API Key

    const response = await axios.get(apiUrl, {
      timeout: 8000, // 增加超时时间，因为IPv6查询可能较慢
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`📊 高德地图API响应状态: ${response.status}`);
    console.log(`📊 高德地图API原始数据:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.status === '1') {
      const data = response.data;
      const province = data.province || '';
      const city = data.city || '';
      const adcode = data.adcode || '';
      
      console.log(`📍 高德地图解析结果: 省份=${province}, 城市=${city}, 区域码=${adcode}`);

      // 处理特殊情况
      if (province === '局域网') {
        console.log('🏠 检测到内网地址');
        return {
          location: '内网地址',
          country: 'Local',
          region: '局域网',
          city: '本地',
          provider: '局域网'
        };
      }

      // 处理海外IP
      if (!province && !city) {
        console.log('🌍 可能为海外IP地址，高德地图暂不支持');
        throw new Error('高德地图不支持海外IP查询');
      }

      // 组装完整地址
      let location = '中国';
      if (province) location += `, ${province}`;
      if (city && city !== province) location += `, ${city}`;

      const result = {
        location,
        country: 'CN',
        region: province || '未知',
        city: city || '未知',
        provider: '未知运营商' // 高德API不提供运营商信息
      };

      console.log(`✅ 高德地图API获取成功:`, result);
      return result;
    } else {
      const errorMsg = response.data.info || response.data.infocode || '未知错误';
      console.warn(`❌ 高德地图API返回错误: status=${response.data.status}, info=${errorMsg}`);
      throw new Error(`高德地图API返回失败: ${errorMsg}`);
    }
  } catch (error: any) {
    const ipVersion = ip.includes(':') ? 'IPv6' : 'IPv4';
    
    if (error.message.includes('timeout')) {
      console.warn(`⏱️ 高德地图API超时 (${ipVersion}):`, error.message);
    } else if (error.message.includes('ENOTFOUND') || error.message.includes('网络')) {
      console.warn(`🌐 高德地图API网络错误 (${ipVersion}):`, error.message);
    } else {
      console.warn(`❌ 高德地图API获取失败 (${ipVersion}):`, error.message);
    }
    
    return null;
  }
};

/**
 * 使用ip-api.com获取详细地理位置信息（备用方案）
 */
export const getIpApiLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
} | null> => {
  const axios = require('axios');

  try {
    console.log(`🌍 使用ip-api.com获取IP地理位置: ${ip}`);
    const response = await axios.get(`http://ip-api.com/json/${ip}?lang=zh-CN`, {
      timeout: 5000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log(`📊 ip-api.com原始响应:`, JSON.stringify(response.data, null, 2));

    if (response.data && response.data.status === 'success') {
      const data = response.data;
      const country = data.country || '未知国家';
      const region = data.regionName || '';
      const city = data.city || '';
      const isp = data.isp || data.org || '';

      // 组装完整地址
      let location = country;
      if (region) location += `, ${region}`;
      if (city && city !== region) location += `, ${city}`;

      const result = {
        location,
        country: data.countryCode || 'Unknown',
        region: region || '未知',
        city: city || '未知',
        provider: isp || '未知运营商'
      };

      console.log(`✅ ip-api.com获取成功:`, result);
      return result;
    } else {
      throw new Error('ip-api.com返回数据格式错误');
    }
  } catch (error: any) {
    console.warn(`❌ ip-api.com获取失败:`, error.message);
    return null;
  }
};



/**
 * 获取IP地理位置信息（主函数）
 * 优先级：1.高德地图API -> 2.百度API -> 3.ip-api.com
 */
export const getIPLocation = async (ip: string): Promise<{
  location: string;
  country: string;
  region: string;
  city: string;
  provider: string;
}> => {
  let targetIP = ip;

  // 检测IP版本
  const ipVersion = isValidIP(ip) ? (ip.includes(':') ? 'IPv6' : 'IPv4') : 'Unknown';
  console.log(`🎯 开始获取IP地理位置: ${ip} (${ipVersion})`);

  // 如果传入的是内网IP，尝试获取真实公网IP
  if (isPrivateIP(ip)) {
    console.log(`🔄 检测到内网IP: ${ip}，尝试获取真实公网IP`);
    try {
      targetIP = await getRealPublicIP();
      const targetIPVersion = isValidIP(targetIP) ? (targetIP.includes(':') ? 'IPv6' : 'IPv4') : 'Unknown';
      console.log(`✅ 使用真实公网IP: ${targetIP} (${targetIPVersion}) 替代内网IP: ${ip}`);
    } catch (error) {
      console.warn('⚠️  获取真实公网IP失败，返回内网地址信息');
      return {
        location: '内网地址',
        country: 'Local',
        region: '局域网',
        city: '本地',
        provider: '局域网'
      };
    }
  }

  // 地理位置服务优先级顺序（根据用户要求调整）
  const services = [
    { 
      name: '🗺️ 高德地图API', 
      func: getAmapIPLocation,
      description: '官方推荐，精度高，支持IPv4/IPv6'
    },
    { 
      name: '🌐 百度API', 
      func: getBaiduIPLocation,
      description: '备选方案，多接口保障'
    },
    { 
      name: '🌍 ip-api.com', 
      func: getIpApiLocation,
      description: '国际服务，最后备选'
    }
  ];

  console.log(`📍 IP地理位置查询策略 (${ipVersion}):`);
  services.forEach((service, index) => {
    console.log(`   ${index + 1}. ${service.name} - ${service.description}`);
  });

  for (const service of services) {
    try {
      console.log(`🔍 尝试使用 ${service.name} 获取位置信息...`);
      const startTime = Date.now();
      
      const result = await service.func(targetIP);
      const duration = Date.now() - startTime;
      
      if (result) {
        console.log(`✅ ${service.name} 获取成功 (${duration}ms):`, {
          ip: targetIP,
          ipVersion,
          location: result.location,
          country: result.country,
          region: result.region,
          city: result.city,
          provider: result.provider
        });
        return result;
      } else {
        console.warn(`⚠️ ${service.name} 返回空结果`);
      }
    } catch (error: any) {
      console.warn(`❌ ${service.name} 获取失败:`, error.message);
    }
  }

  // 如果所有服务都失败，返回默认位置
  console.warn(`⚠️ 所有IP地理位置服务都失败，IP: ${targetIP} (${ipVersion})`);
  return {
    location: `未知地区 (${ipVersion})`,
    country: 'Unknown',
    region: '未知',
    city: '未知',
    provider: '未知运营商'
  };
};


