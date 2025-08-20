import { Request, Response } from 'express';
import { Member, Agent } from '../models';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';
import { getClientIP, getIPLocation } from '../utils/geoipUtils';
import LoginLogService from '../services/loginLogService';

// 会员登录
export const memberLogin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { username, password } = req.body;

    // 验证输入
    if (!username || !password) {
      res.status(400).json({
        status: 'error',
        message: '用户名和密码不能为空',
        code: 'MISSING_CREDENTIALS'
      });
      return;
    }

    // 查找会员
    const member = await Member.findOne({
      where: { username },
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname', 'status']
        }
      ]
    });

    if (!member) {
      // 记录登录失败日志
      try {
        await LoginLogService.recordFailureLogin(req, {
          username,
          userType: 'member',
          failureReason: '用户名不存在'
        });
      } catch (error) {
        console.error('记录登录失败日志失败:', error);
      }

      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await member.validatePassword(password);
    if (!isValidPassword) {
      // 记录登录失败日志
      try {
        await LoginLogService.recordFailureLogin(req, {
          userId: member.id,
          username,
          userType: 'member',
          failureReason: '密码错误'
        });
      } catch (error) {
        console.error('记录登录失败日志失败:', error);
      }

      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 检查会员账户状态
    if (member.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '会员账户已被禁用',
        code: 'MEMBER_DISABLED'
      });
      return;
    }

    // 检查所属代理商状态
    const agent = (member as any).agent;
    if (!agent || agent.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '所属代理商账户已被禁用',
        code: 'AGENT_DISABLED'
      });
      return;
    }

    // 记录登录成功日志
    try {
      await LoginLogService.recordSuccessLogin(req, {
        id: member.id,
        username: member.username,
        type: 'member'
      });
    } catch (error) {
      console.error('记录登录日志失败:', error);
      // 不影响登录流程，继续执行
    }

    // 获取客户端IP地址和地理位置（用于更新会员信息）
    const clientIP = await getClientIP(req);
    let locationInfo;

    try {
      locationInfo = await getIPLocation(clientIP);

      // 检查是否在中国境内（可选的安全检查）
      const isInChina = locationInfo.country === 'CN' || locationInfo.location.includes('中国');
      console.log(`会员 ${member.username} 登录，IP: ${clientIP}, 位置: ${locationInfo.location}, 是否在中国: ${isInChina}`);

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

    // 更新会员的登录信息
    try {
      await member.update({
        lastLoginAt: new Date(),
        lastLoginIp: clientIP,
        lastLoginLocation: locationInfo.location
      });
    } catch (error) {
      console.error('更新会员登录信息失败:', error);
      // 不影响登录流程，继续执行
    }

    // 生成令牌（会员类型）
    const accessToken = generateAccessToken({
      id: member.id,
      username: member.username,
      role: 'member',
      type: 'access'
    });

    const refreshToken = generateRefreshToken({
      id: member.id,
      username: member.username,
      role: 'member',
      type: 'refresh'
    });

    // 重新获取更新后的会员信息
    const updatedMember = await Member.findByPk(member.id, {
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname', 'status']
        }
      ]
    });

    res.status(200).json({
      status: 'success',
      message: '登录成功',
      data: {
        member: updatedMember!.toSafeJSON(),
        agent: {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  } catch (error) {
    console.error('会员登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 会员登出
export const memberLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // 这里可以添加令牌黑名单逻辑
    res.status(200).json({
      status: 'success',
      message: '登出成功'
    });
  } catch (error) {
    console.error('会员登出错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取会员资料
export const getMemberProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = (req as any).member?.id;

    if (!memberId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    const member = await Member.findByPk(memberId, {
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'nickname', 'status']
        }
      ]
    });

    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取会员资料成功',
      data: {
        member: member.toSafeJSON(),
        agent: (member as any).agent
      }
    });
  } catch (error) {
    console.error('获取会员资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取会员余额
export const getMemberBalance = async (req: Request, res: Response): Promise<void> => {
  try {
    const memberId = (req as any).member?.id;

    if (!memberId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    const member = await Member.findByPk(memberId, {
      attributes: ['id', 'username', 'nickname', 'balance', 'status', 'updatedAt']
    });

    if (!member) {
      res.status(404).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取余额成功',
      data: {
        balance: member.balance,
        member: {
          id: member.id,
          username: member.username,
          nickname: member.nickname,
          status: member.status
        },
        lastUpdated: member.updatedAt
      }
    });
  } catch (error) {
    console.error('获取会员余额错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
