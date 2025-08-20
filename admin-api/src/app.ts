import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import path from 'path';

import routes from './routes';

// 加载环境变量
dotenv.config();

// 创建Express应用
const app = express();

// 速率限制中间件 - 开发环境更宽松的限制
const isDevelopment = process.env.NODE_ENV === 'development';
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000'), // 15分钟
  max: isDevelopment ? 10000 : parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '1000'), // 开发环境10000个请求，生产环境1000个
  message: {
    status: 'error',
    message: '请求过于频繁，请稍后再试',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true, // 返回速率限制信息在 `RateLimit-*` 头部
  legacyHeaders: false, // 禁用 `X-RateLimit-*` 头部
  // 开发环境跳过本地请求
  skip: (req): boolean => {
    if (isDevelopment) {
      const ip = req.ip || req.connection.remoteAddress;
      return Boolean(ip === '127.0.0.1' || ip === '::1' || ip?.startsWith('192.168.') || ip?.startsWith('10.') || ip?.startsWith('172.'));
    }
    return false;
  }
});

// 中间件
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务 - 用于头像等文件访问
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    'http://localhost:5175',
    'http://127.0.0.1:5175',
    'http://26.26.26.1:5175',
    'http://172.27.0.1:5175',
    'http://192.168.1.100:5175',
    'http://172.24.192.1:5175',
    'http://localhost:8848',
    'http://127.0.0.1:8848',
    'http://localhost:8849',
    'http://127.0.0.1:8849',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:4000',
    'http://127.0.0.1:4000',
    process.env.CORS_ORIGIN || 'http://localhost:5173'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));
app.use(helmet());
// 自定义日志格式，过滤开发者工具请求
app.use(morgan('dev', {
  skip: (req) => {
    // 跳过Chrome开发者工具的请求日志
    return req.url.includes('/.well-known/appspecific/') ||
           req.url === '/favicon.ico';
  }
}));
app.use('/api', limiter);

// 静态文件服务
app.use(express.static(path.join(__dirname, '..', 'public')));

// 处理Chrome开发者工具请求（避免404日志）
app.get('/.well-known/appspecific/com.chrome.devtools.json', (_req, res) => {
  res.status(204).end(); // 204 No Content
});

// API路由
app.use('/api', routes);

// 基础路由
app.get('/', (_req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>后端管理系统 API</title>
      <style>
        body { font-family: Arial, sans-serif; max-width: 800px; margin: 50px auto; padding: 20px; }
        .header { text-align: center; color: #333; }
        .api-info { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .endpoint { background: white; padding: 15px; margin: 10px 0; border-left: 4px solid #007bff; }
        .method { color: #007bff; font-weight: bold; }
        .status { color: #28a745; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 后端管理系统 API</h1>
        <p class="status">✅ 服务运行正常</p>
      </div>

      <div class="api-info">
        <h2>📋 API 信息</h2>
        <p><strong>服务地址:</strong> http://localhost:${process.env.PORT || 3001}</p>
        <p><strong>API 前缀:</strong> /api</p>
        <p><strong>启动时间:</strong> ${new Date().toLocaleString('zh-CN')}</p>
      </div>

      <div class="api-info">
        <h2>🔗 主要接口</h2>

        <div class="endpoint">
          <div><span class="method">POST</span> /api/admin/auth/login</div>
          <div>管理员登录</div>
        </div>

        <div class="endpoint">
          <div><span class="method">GET</span> /api/admin/dashboard/stats</div>
          <div>获取仪表盘统计数据</div>
        </div>

        <div class="endpoint">
          <div><span class="method">GET</span> /api/admin/agents</div>
          <div>获取代理商列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method">GET</span> /api/admin/members</div>
          <div>获取会员列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method">GET</span> /health</div>
          <div>健康检查</div>
        </div>
      </div>

      <div class="api-info">
        <h2>📖 文档</h2>
        <p>详细的API文档请查看项目中的 <code>API_GUIDE.md</code> 文件</p>
      </div>
    </body>
    </html>
  `);
});

app.get('/health', (_req: Request, res: Response) => {
  res.status(200).json({
    status: 'success',
    message: '系统运行正常',
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// 错误处理中间件
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '服务器内部错误',
    code: 'SERVER_ERROR'
  });
});

export default app;