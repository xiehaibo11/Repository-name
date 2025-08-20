import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from '../utils/jwt';
import { Admin, Agent, Member } from '../models';

// 扩展Request接口以包含用户信息
declare global {
  namespace Express {
    interface Request {
      admin?: {
        id: number;
        username: string;
        role: 'super_admin' | 'admin';
      };
      agent?: {
        id: number;
        username: string;
        role: 'agent' | 'agent_member';
      };
      member?: {
        id: number;
        username: string;
        role: 'member';
      };
    }
  }
}

// 认证中间件
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);
    
    if (!token) {
      res.status(401).json({
        status: 'error',
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // 验证令牌
    const decoded: JWTPayload = verifyAccessToken(token);
    
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

    // 将用户信息添加到请求对象
    req.admin = {
      id: admin.id,
      username: admin.username,
      role: admin.role,
    };

    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: '无效的访问令牌',
      code: 'INVALID_TOKEN'
    });
  }
};

// 角色权限中间件
export const requireRole = (roles: ('super_admin' | 'admin')[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.admin) {
      res.status(401).json({
        status: 'error',
        message: '未认证',
        code: 'UNAUTHENTICATED'
      });
      return;
    }

    if (!roles.includes(req.admin.role)) {
      res.status(403).json({
        status: 'error',
        message: '权限不足',
        code: 'INSUFFICIENT_PERMISSIONS'
      });
      return;
    }

    next();
  };
};

// 超级管理员权限中间件
export const requireSuperAdmin = requireRole(['super_admin']);

// 管理员权限中间件（包括超级管理员）
export const requireAdmin = requireRole(['super_admin', 'admin']);

// 代理商认证中间件
export const authenticateAgent = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // 验证令牌
    const decoded: JWTPayload = verifyAccessToken(token);

    // 检查是否为代理商令牌
    if (!decoded.role || !['agent', 'agent_member'].includes(decoded.role)) {
      res.status(401).json({
        status: 'error',
        message: '无效的代理商令牌',
        code: 'INVALID_AGENT_TOKEN'
      });
      return;
    }

    // 验证代理商是否仍然存在且状态正常
    const agent = await Agent.findByPk(decoded.id);
    if (!agent) {
      res.status(401).json({
        status: 'error',
        message: '代理商不存在',
        code: 'AGENT_NOT_FOUND'
      });
      return;
    }

    if (agent.status !== 'active') {
      res.status(401).json({
        status: 'error',
        message: '代理商账户已被禁用',
        code: 'AGENT_DISABLED'
      });
      return;
    }

    // 将代理商信息添加到请求对象
    req.agent = {
      id: agent.id,
      username: agent.username,
      role: decoded.role as 'agent' | 'agent_member',
    };

    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: '无效的访问令牌',
      code: 'INVALID_TOKEN'
    });
  }
};

// 代理商后台权限中间件
export const requireAgentBackend = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.agent) {
    res.status(401).json({
      status: 'error',
      message: '未认证',
      code: 'UNAUTHENTICATED'
    });
    return;
  }

  if (req.agent.role !== 'agent') {
    res.status(403).json({
      status: 'error',
      message: '权限不足',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  next();
};

// 代理商前端权限中间件
export const requireAgentMember = (req: Request, res: Response, next: NextFunction): void => {
  if (!req.agent) {
    res.status(401).json({
      status: 'error',
      message: '未认证',
      code: 'UNAUTHENTICATED'
    });
    return;
  }

  if (req.agent.role !== 'agent_member') {
    res.status(403).json({
      status: 'error',
      message: '权限不足',
      code: 'INSUFFICIENT_PERMISSIONS'
    });
    return;
  }

  next();
};

// 会员认证中间件
export const authenticateMember = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = extractTokenFromHeader(req.headers.authorization);

    if (!token) {
      res.status(401).json({
        status: 'error',
        message: '访问令牌缺失',
        code: 'TOKEN_MISSING'
      });
      return;
    }

    // 验证令牌
    const decoded: JWTPayload = verifyAccessToken(token);

    // 检查是否为会员令牌
    if (!decoded.role || (decoded.role as string) !== 'member') {
      res.status(401).json({
        status: 'error',
        message: '无效的会员令牌',
        code: 'INVALID_MEMBER_TOKEN'
      });
      return;
    }

    // 验证会员是否仍然存在且状态正常
    const member = await Member.findByPk(decoded.id, {
      include: [
        {
          model: Agent,
          as: 'agent',
          attributes: ['id', 'username', 'status']
        }
      ]
    });

    if (!member) {
      res.status(401).json({
        status: 'error',
        message: '会员不存在',
        code: 'MEMBER_NOT_FOUND'
      });
      return;
    }

    // 检查会员状态
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

    // 将会员信息添加到请求对象
    req.member = {
      id: member.id,
      username: member.username,
      role: 'member',
    };

    next();
  } catch (error) {
    res.status(401).json({
      status: 'error',
      message: '无效的访问令牌',
      code: 'INVALID_TOKEN'
    });
  }
};
