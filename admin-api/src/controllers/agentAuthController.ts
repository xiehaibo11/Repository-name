import { Request, Response } from 'express';
import { Agent } from '../models';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

// 代理商登录（后台管理系统）
export const agentLogin = async (req: Request, res: Response): Promise<void> => {
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

    // 查找代理商
    const agent = await Agent.findOne({
      where: { username }
    });

    if (!agent) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await agent.validatePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 检查账户状态
    if (agent.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '账户已被禁用',
        code: 'ACCOUNT_DISABLED'
      });
      return;
    }

    // 生成令牌（代理商类型）
    const accessToken = generateAccessToken({
      id: agent.id,
      username: agent.username,
      role: 'agent',
      type: 'access'
    } as any);

    const refreshToken = generateRefreshToken({
      id: agent.id,
      username: agent.username,
      role: 'agent',
      type: 'refresh'
    } as any);

    res.status(200).json({
      status: 'success',
      message: '登录成功',
      data: {
        agent: agent.toSafeJSON(),
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  } catch (error) {
    console.error('代理商登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 代理商登录（前端会员系统）
export const agentMemberLogin = async (req: Request, res: Response): Promise<void> => {
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

    // 查找代理商
    const agent = await Agent.findOne({
      where: { username }
    });

    if (!agent) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await agent.validatePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 检查账户状态
    if (agent.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '账户已被禁用',
        code: 'ACCOUNT_DISABLED'
      });
      return;
    }

    // 生成前端会员令牌
    const accessToken = generateAccessToken({
      id: agent.id,
      username: agent.username,
      role: 'agent_member',
      type: 'access'
    } as any);

    const refreshToken = generateRefreshToken({
      id: agent.id,
      username: agent.username,
      role: 'agent_member',
      type: 'refresh'
    } as any);

    res.status(200).json({
      status: 'success',
      message: '登录成功',
      data: {
        user: {
          id: agent.id,
          username: agent.username,
          nickname: agent.nickname,
          userType: 'agent',
          credit: agent.credit,
          status: agent.status
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
    console.error('代理商会员登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取代理商资料
export const getAgentProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const agentId = req.agent?.id;
    
    if (!agentId) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    const agent = await Agent.findByPk(agentId);
    
    if (!agent) {
      res.status(404).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取资料成功',
      data: {
        agent: agent.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('获取代理商资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 代理商登出
export const agentLogout = async (req: Request, res: Response): Promise<void> => {
  try {
    // 这里可以添加令牌黑名单逻辑
    res.status(200).json({
      status: 'success',
      message: '登出成功'
    });
  } catch (error) {
    console.error('代理商登出错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};
