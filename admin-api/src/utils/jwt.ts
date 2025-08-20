import jwt from 'jsonwebtoken';
import { AdminAttributes } from '../models/Admin';
import { AgentAttributes } from '../models/Agent';

// JWT载荷接口
export interface JWTPayload {
  id: number;
  username: string;
  role: 'super_admin' | 'admin' | 'agent' | 'agent_member' | 'member';
  type: 'access' | 'refresh';
}

// 生成访问令牌
export const generateAccessToken = (user: AdminAttributes | AgentAttributes | JWTPayload): string => {
  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    role: (user as any).role || 'admin',
    type: 'access',
  };

  return jwt.sign(payload, process.env.JWT_SECRET!, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  } as any);
};

// 生成刷新令牌
export const generateRefreshToken = (user: AdminAttributes | AgentAttributes | JWTPayload): string => {
  const payload: JWTPayload = {
    id: user.id,
    username: user.username,
    role: (user as any).role || 'admin',
    type: 'refresh',
  };

  return jwt.sign(payload, process.env.JWT_REFRESH_SECRET!, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  } as any);
};

// 验证访问令牌
export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid access token');
  }
};

// 验证刷新令牌
export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const decoded = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as JWTPayload;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    throw new Error('Invalid refresh token');
  }
};

// 生成令牌对（访问令牌和刷新令牌）
export const generateTokens = (payload: Omit<JWTPayload, 'type'>) => {
  const accessToken = generateAccessToken(payload as AdminAttributes);
  const refreshToken = generateRefreshToken(payload as AdminAttributes);

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    token_type: 'Bearer',
    expires_in: process.env.JWT_EXPIRES_IN || '24h'
  };
};

// 通用令牌验证函数
export const verifyToken = (token: string, type: 'access' | 'refresh' = 'access'): JWTPayload | null => {
  try {
    if (type === 'access') {
      return verifyAccessToken(token);
    } else {
      return verifyRefreshToken(token);
    }
  } catch (error) {
    return null;
  }
};

// 从请求头中提取令牌
export const extractTokenFromHeader = (authHeader: string | undefined): string | null => {
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    return null;
  }

  return parts[1];
};
