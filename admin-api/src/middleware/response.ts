import { Response } from 'express';

// 标准响应接口
export interface StandardResponse<T = any> {
  status: 'success' | 'error';
  message: string;
  data?: T;
  code?: string;
  timestamp?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// 扩展Response对象
declare global {
  namespace Express {
    interface Response {
      success<T>(data?: T, message?: string): Response;
      error(message: string, code?: string, statusCode?: number): Response;
      paginated<T>(data: T[], pagination: {
        page: number;
        limit: number;
        total: number;
      }, message?: string): Response;
    }
  }
}

// 响应中间件
export const responseMiddleware = (req: any, res: Response, next: any) => {
  // 成功响应
  res.success = function<T>(data?: T, message: string = '操作成功') {
    const response: StandardResponse<T> = {
      status: 'success',
      message,
      data,
      timestamp: new Date().toISOString()
    };
    return this.json(response);
  };

  // 错误响应
  res.error = function(message: string, code?: string, statusCode: number = 400) {
    const response: StandardResponse = {
      status: 'error',
      message,
      code,
      timestamp: new Date().toISOString()
    };
    return this.status(statusCode).json(response);
  };

  // 分页响应
  res.paginated = function<T>(
    data: T[], 
    pagination: { page: number; limit: number; total: number },
    message: string = '获取数据成功'
  ) {
    const totalPages = Math.ceil(pagination.total / pagination.limit);
    
    const response: StandardResponse<T[]> = {
      status: 'success',
      message,
      data,
      pagination: {
        ...pagination,
        totalPages
      },
      timestamp: new Date().toISOString()
    };
    return this.json(response);
  };

  next();
};

// 常用错误响应
export const commonErrors = {
  UNAUTHORIZED: { message: '未授权访问', code: 'UNAUTHORIZED', status: 401 },
  FORBIDDEN: { message: '权限不足', code: 'FORBIDDEN', status: 403 },
  NOT_FOUND: { message: '资源不存在', code: 'NOT_FOUND', status: 404 },
  VALIDATION_ERROR: { message: '数据验证失败', code: 'VALIDATION_ERROR', status: 400 },
  INTERNAL_ERROR: { message: '服务器内部错误', code: 'INTERNAL_ERROR', status: 500 },
  TOKEN_MISSING: { message: '访问令牌缺失', code: 'TOKEN_MISSING', status: 401 },
  TOKEN_INVALID: { message: '访问令牌无效', code: 'TOKEN_INVALID', status: 401 },
  TOKEN_EXPIRED: { message: '访问令牌已过期', code: 'TOKEN_EXPIRED', status: 401 }
};

// 快速错误响应函数
export const sendError = (res: Response, errorType: keyof typeof commonErrors, customMessage?: string) => {
  const error = commonErrors[errorType];
  return res.error(customMessage || error.message, error.code, error.status);
};

// 异步错误处理包装器
export const asyncHandler = (fn: Function) => {
  return (req: any, res: Response, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// 全局错误处理中间件
export const globalErrorHandler = (error: any, req: any, res: Response, next: any) => {
  console.error('全局错误:', error);

  // 数据库错误
  if (error.code === '23505') { // PostgreSQL unique violation
    return res.error('数据已存在', 'DUPLICATE_ENTRY', 409);
  }

  if (error.code === '23503') { // PostgreSQL foreign key violation
    return res.error('关联数据不存在', 'FOREIGN_KEY_VIOLATION', 400);
  }

  // JWT错误
  if (error.name === 'JsonWebTokenError') {
    return sendError(res, 'TOKEN_INVALID');
  }

  if (error.name === 'TokenExpiredError') {
    return sendError(res, 'TOKEN_EXPIRED');
  }

  // 验证错误
  if (error.name === 'ValidationError') {
    return res.error(error.message, 'VALIDATION_ERROR', 400);
  }

  // 默认错误
  return sendError(res, 'INTERNAL_ERROR');
};
