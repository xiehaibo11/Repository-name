import { Request, Response } from 'express';
import { Admin } from '../models';
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt';

// 管理员登录
export const login = async (req: Request, res: Response): Promise<void> => {
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

    // 查找管理员
    const admin = await Admin.findOne({
      where: { username }
    });

    if (!admin) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 验证密码
    const isValidPassword = await admin.validatePassword(password);
    if (!isValidPassword) {
      res.status(401).json({
        status: 'error',
        message: '用户名或密码错误',
        code: 'INVALID_CREDENTIALS'
      });
      return;
    }

    // 检查账户状态
    if (admin.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '账户已被禁用',
        code: 'ACCOUNT_DISABLED'
      });
      return;
    }

    // 生成令牌
    const accessToken = generateAccessToken(admin);
    const refreshToken = generateRefreshToken(admin);

    res.status(200).json({
      status: 'success',
      message: '登录成功',
      data: {
        admin: admin.toSafeJSON(),
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  } catch (error) {
    console.error('登录错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 管理员登出
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // 在实际应用中，这里可以将令牌加入黑名单
    // 目前只是返回成功响应
    res.status(200).json({
      status: 'success',
      message: '登出成功'
    });
  } catch (error) {
    console.error('登出错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 获取管理员资料
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.admin) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    // 获取完整的管理员信息
    const admin = await Admin.findByPk(req.admin.id);
    if (!admin) {
      res.status(404).json({
        status: 'error',
        message: '管理员不存在',
        code: 'ADMIN_NOT_FOUND'
      });
      return;
    }

    res.status(200).json({
      status: 'success',
      message: '获取资料成功',
      data: {
        admin: admin.toSafeJSON()
      }
    });
  } catch (error) {
    console.error('获取资料错误:', error);
    res.status(500).json({
      status: 'error',
      message: '服务器内部错误',
      code: 'SERVER_ERROR'
    });
  }
};

// 刷新令牌
export const refreshToken = async (req: Request, res: Response): Promise<void> => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      res.status(400).json({
        status: 'error',
        message: '刷新令牌不能为空',
        code: 'MISSING_REFRESH_TOKEN'
      });
      return;
    }

    // 验证刷新令牌
    const decoded = verifyRefreshToken(refresh_token);

    // 验证用户是否仍然存在且状态正常
    const admin = await Admin.findByPk(decoded.id);
    if (!admin) {
      res.status(401).json({
        status: 'error',
        message: '用户不存在',
        code: 'USER_NOT_FOUND'
      });
      return;
    }

    if (admin.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '用户账户已被禁用',
        code: 'USER_DISABLED'
      });
      return;
    }

    // 生成新的访问令牌和刷新令牌
    const newAccessToken = generateAccessToken(admin);
    const newRefreshToken = generateRefreshToken(admin);

    res.status(200).json({
      status: 'success',
      message: '令牌刷新成功',
      data: {
        tokens: {
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          token_type: 'Bearer',
          expires_in: process.env.JWT_EXPIRES_IN || '24h'
        }
      }
    });
  } catch (error) {
    console.error('刷新令牌错误:', error);
    res.status(401).json({
      status: 'error',
      message: '无效的刷新令牌',
      code: 'INVALID_REFRESH_TOKEN'
    });
  }
};
