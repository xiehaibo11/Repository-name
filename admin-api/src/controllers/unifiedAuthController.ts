import { Request, Response } from 'express';
import { Admin, Agent, Member } from '../models';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { getClientIP, getIPLocation, getRealPublicIP } from '../utils/geoipUtils';

// 统一登录接口 - 支持管理员、代理商、会员
export const unifiedLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password, userType, clientIP } = req.body;

    // 验证输入
    if (!username || !password) {
      res.status(400).json({
        status: 'error',
        message: '用户名和密码不能为空',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // 验证用户类型
    if (!userType || !['admin', 'agent', 'member'].includes(userType)) {
      res.status(400).json({
        status: 'error',
        message: '用户类型无效',
        code: 'INVALID_USER_TYPE'
      });
      return;
    }

    let user: any = null;
    let userRole: string = '';
    let userData: any = {};

    // 根据用户类型查找用户
    switch (userType) {
      case 'admin':
        user = await Admin.findOne({ where: { username } });
        if (user) {
          userRole = user.role;
          userData = {
            admin: user.toSafeJSON(),
            userType: 'admin'
          };
        }
        break;

      case 'agent':
        user = await Agent.findOne({ where: { username } });
        if (user) {
          userRole = 'agent';
          userData = {
            agent: user.toSafeJSON(),
            userType: 'agent'
          };
        }
        break;

      case 'member':
        user = await Member.findOne({
          where: { username },
          include: [
            {
              model: Agent,
              as: 'agent',
              attributes: ['id', 'username', 'nickname', 'status']
            }
          ]
        });
        if (user) {
          userRole = 'member';
          const agent = (user as any).agent;
          userData = {
            member: user.toSafeJSON(),
            agent: agent ? {
              id: agent.id,
              username: agent.username,
              nickname: agent.nickname
            } : null,
            userType: 'member'
          };
        }
        break;
    }

    // 检查用户是否存在
    if (!user) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 检查账户状态
    if (user.status !== 'active') {
      let message = '';
      let code = '';
      
      switch (userType) {
        case 'admin':
          message = '管理员账户已被禁用';
          code = 'ADMIN_DISABLED';
          break;
        case 'agent':
          message = '代理商账户已被禁用';
          code = 'AGENT_DISABLED';
          break;
        case 'member':
          message = '会员账户已被禁用';
          code = 'MEMBER_DISABLED';
          break;
      }

      res.status(401).json({
        status: 'error',
        message,
        code
      });
      return;
    }

    // 对于会员，还需要检查所属代理商状态
    if (userType === 'member') {
      const agent = (user as any).agent;
      if (!agent || agent.status !== 'active') {
        res.status(401).json({
          status: 'error',
          message: '所属代理商账户已被禁用',
          code: 'AGENT_DISABLED'
        });
        return;
      }
    }

    // 获取客户端IP和地理位置信息（仅对会员）
    let locationInfo = null;
    let isOverseas = false;

    if (userType === 'member') {
      try {
        // 优先使用前端传递的真实IP，否则从请求头获取
        const realClientIP = clientIP || await getClientIP(req);
        console.log(`🌐 会员 ${username} 登录IP: ${realClientIP}${clientIP ? ' (前端获取)' : ' (后端获取)'}`);

        // 获取IP地理位置信息
        const ipLocation = await getIPLocation(realClientIP);
        console.log(`📍 IP地理位置解析结果:`, ipLocation);

        // 判断是否为国外IP
        isOverseas = ipLocation.country !== 'CN' && ipLocation.country !== 'Local' && ipLocation.country !== 'Unknown';

        if (isOverseas) {
          console.log(`🚨 检测到会员 ${username} 从国外登录: ${ipLocation.location}`);

          // 可以在这里添加国外登录的处理逻辑
          // 例如：记录日志、发送警告、要求额外验证等
          // 目前先允许登录，但标记为海外登录
        }

        locationInfo = {
          ip: realClientIP,
          location: ipLocation.location,
          country: ipLocation.country,
          region: ipLocation.region,
          city: ipLocation.city,
          provider: ipLocation.provider,
          isOverseas: isOverseas,
          loginTime: new Date().toISOString()
        };

        console.log(`✅ 会员 ${username} 登录信息:`, {
          ip: realClientIP,
          location: ipLocation.location,
          isOverseas: isOverseas ? '是' : '否'
        });

      } catch (error) {
        console.error('获取IP地理位置失败:', error);
        // 如果获取位置失败，为安全起见，标记为可能的海外登录
        locationInfo = {
          ip: clientIP || await getClientIP(req),
          location: '位置解析失败',
          country: 'Unknown',
          region: 'Unknown',
          city: 'Unknown',
          provider: 'Unknown',
          isOverseas: true, // 安全起见，标记为海外
          loginTime: new Date().toISOString()
        };
      }
    }

    // 生成令牌
    const accessToken = generateAccessToken({
      id: user.id,
      username: user.username,
      role: userRole as 'super_admin' | 'admin' | 'agent' | 'agent_member' | 'member',
      type: 'access'
    });

    const refreshToken = generateRefreshToken({
      id: user.id,
      username: user.username,
      role: userRole as 'super_admin' | 'admin' | 'agent' | 'agent_member' | 'member',
      type: 'refresh'
    });

    // 构建响应数据
    const responseData = {
      ...userData,
      tokens: {
        access_token: accessToken,
        refresh_token: refreshToken,
        token_type: 'Bearer',
        expires_in: process.env.JWT_EXPIRES_IN || '24h'
      }
    };

    // 如果是会员登录且获取到了位置信息，添加到响应中
    if (userType === 'member' && locationInfo) {
      responseData.locationInfo = locationInfo;
    }

    res.status(200).json({
      status: 'success',
      message: '登录成功',
      data: responseData
    });
  } catch (error) {
    console.error('统一登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 检查用户状态接口
export const checkUserStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, userType } = req.body;

    if (!username || !userType) {
      res.status(400).json({
        status: 'error',
        message: '用户名和用户类型不能为空',
        code: 'MISSING_PARAMETERS'
      });
      return;
    }

    let user: any = null;
    let isActive = false;
    let agentStatus = null;

    switch (userType) {
      case 'admin':
        user = await Admin.findOne({ where: { username } });
        isActive = user?.status === 'active';
        break;

      case 'agent':
        user = await Agent.findOne({ where: { username } });
        isActive = user?.status === 'active';
        break;

      case 'member':
        user = await Member.findOne({
          where: { username },
          include: [
            {
              model: Agent,
              as: 'agent',
              attributes: ['status']
            }
          ]
        });
        isActive = user?.status === 'active';
        agentStatus = (user as any)?.agent?.status;
        break;
    }

    res.status(200).json({
      status: 'success',
      data: {
        exists: !!user,
        isActive,
        agentStatus,
        canLogin: isActive && (userType !== 'member' || agentStatus === 'active')
      }
    });
  } catch (error) {
    console.error('检查用户状态错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// IP地理位置解析接口（用于测试）
export const analyzeIPLocation = async (req: Request, res: Response): Promise<void> => {
  try {
    const { ip } = req.query;

    if (!ip || typeof ip !== 'string') {
      res.status(400).json({
        status: 'error',
        message: 'IP地址参数不能为空',
        code: 'MISSING_IP'
      });
      return;
    }

    console.log(`🧪 测试IP地理位置解析: ${ip}`);

    // 获取IP地理位置信息
    const ipLocation = await getIPLocation(ip);
    console.log(`📍 IP解析结果:`, ipLocation);

    res.status(200).json({
      status: 'success',
      message: 'IP地理位置解析成功',
      data: {
        ip: ip,
        location: ipLocation.location,
        country: ipLocation.country,
        region: ipLocation.region,
        city: ipLocation.city,
        provider: ipLocation.provider,
        isOverseas: ipLocation.country !== 'CN' && ipLocation.country !== 'Local' && ipLocation.country !== 'Unknown'
      }
    });
  } catch (error) {
    console.error('IP地理位置解析错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
