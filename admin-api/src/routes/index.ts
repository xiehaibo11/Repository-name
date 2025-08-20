import { Router } from 'express';
import { Request, Response } from 'express';
import authRoutes from './authRoutes';
import adminProfileRoutes from './adminProfileRoutes';
import agentRoutes from './agentRoutes';
import agentAuthRoutes from './agentAuthRoutes';
import agentBackendRoutes from './agentBackendRoutes';
import memberRoutes from './memberRoutes';
import memberAuthRoutes from './memberAuthRoutes';
import unifiedAuthRoutes from './unifiedAuthRoutes';
import dashboardRoutes from './dashboardRoutes';
import routeRoutes from './routeRoutes';
import noticeRoutes from './noticeRoutes';
import reportRoutes from './reportRoutes';
import lotteryRoutes from './lottery';
import userLotteryRoutes from './userLottery';
import { createSSCRoutes, sscMiddleware } from './ssc';
import loginLogRoutes from './loginLogRoutes';
import securityRoutes from './securityRoutes';
import betRoutes from './betRoutes';
import avoidWinRoutes from './avoidWinRoutes';
import { getPool } from '../config/database';
import { getIPLocation } from '../utils/geoipUtils';

const router = Router();

// API根路径 - 显示API文档
router.get('/', (req: Request, res: Response) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="zh-CN">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>后端管理系统 API 文档</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          background: #f5f7fa;
          color: #333;
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          border-radius: 12px;
          margin-bottom: 30px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.1);
        }
        .header h1 { margin: 0; font-size: 2.5em; font-weight: 300; }
        .header p { margin: 10px 0 0 0; opacity: 0.9; font-size: 1.1em; }
        .section {
          background: white;
          padding: 30px;
          border-radius: 12px;
          margin: 20px 0;
          box-shadow: 0 4px 20px rgba(0,0,0,0.08);
        }
        .section h2 {
          color: #667eea;
          border-bottom: 2px solid #f0f0f0;
          padding-bottom: 10px;
          margin-bottom: 20px;
        }
        .endpoint {
          background: #f8f9ff;
          padding: 20px;
          margin: 15px 0;
          border-left: 4px solid #667eea;
          border-radius: 8px;
          transition: all 0.3s ease;
        }
        .endpoint:hover {
          background: #f0f2ff;
          transform: translateX(5px);
        }
        .method {
          display: inline-block;
          padding: 4px 12px;
          border-radius: 20px;
          font-weight: bold;
          font-size: 0.85em;
          margin-right: 10px;
        }
        .method.get { background: #e8f5e8; color: #2d7d32; }
        .method.post { background: #fff3e0; color: #f57c00; }
        .method.put { background: #e3f2fd; color: #1976d2; }
        .method.patch { background: #fce4ec; color: #c2185b; }
        .method.delete { background: #ffebee; color: #d32f2f; }
        .status {
          display: inline-block;
          background: #e8f5e8;
          color: #2d7d32;
          padding: 6px 16px;
          border-radius: 20px;
          font-weight: 500;
        }
        .info-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 20px;
          margin: 20px 0;
        }
        .info-card {
          background: #f8f9ff;
          padding: 20px;
          border-radius: 8px;
          border-left: 4px solid #667eea;
        }
        .info-card strong { color: #667eea; }
        code {
          background: #f4f4f4;
          padding: 2px 6px;
          border-radius: 4px;
          font-family: 'Courier New', monospace;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 后端管理系统 API</h1>
        <p class="status">✅ 服务运行正常 | 端口: 3001</p>
      </div>

      <div class="section">
        <h2>📋 系统信息</h2>
        <div class="info-grid">
          <div class="info-card">
            <strong>服务地址:</strong><br>
            http://localhost:3001
          </div>
          <div class="info-card">
            <strong>API 前缀:</strong><br>
            /api
          </div>
          <div class="info-card">
            <strong>数据库:</strong><br>
            PostgreSQL
          </div>
          <div class="info-card">
            <strong>启动时间:</strong><br>
            ${new Date().toLocaleString('zh-CN')}
          </div>
        </div>
      </div>

      <div class="section">
        <h2>🔐 认证接口</h2>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/auth/login</div>
          <div style="margin-top: 8px; color: #666;">统一登录接口（支持管理员、代理商、会员）</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: username, password, userType</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/auth/check-status</div>
          <div style="margin-top: 8px; color: #666;">检查用户状态</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/auth/login</div>
          <div style="margin-top: 8px; color: #666;">管理员登录（传统接口）</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/auth/profile</div>
          <div style="margin-top: 8px; color: #666;">获取管理员资料</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/auth/refresh</div>
          <div style="margin-top: 8px; color: #666;">刷新访问令牌</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/auth/logout</div>
          <div style="margin-top: 8px; color: #666;">管理员登出</div>
        </div>
      </div>

      <div class="section">
        <h2>📊 仪表盘接口</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/dashboard/stats</div>
          <div style="margin-top: 8px; color: #666;">获取统计数据</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/dashboard/charts</div>
          <div style="margin-top: 8px; color: #666;">获取图表数据</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/dashboard/activities</div>
          <div style="margin-top: 8px; color: #666;">获取系统活动日志</div>
        </div>
      </div>

      <div class="section">
        <h2>👥 代理商管理</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/agents</div>
          <div style="margin-top: 8px; color: #666;">获取代理商列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/agents</div>
          <div style="margin-top: 8px; color: #666;">创建代理商</div>
        </div>

        <div class="endpoint">
          <div><span class="method put">PUT</span> /api/admin/agents/{id}</div>
          <div style="margin-top: 8px; color: #666;">更新代理商信息</div>
        </div>

        <div class="endpoint">
          <div><span class="method patch">PATCH</span> /api/admin/agents/{id}/credit</div>
          <div style="margin-top: 8px; color: #666;">调整代理商信用额度</div>
        </div>

        <div class="endpoint">
          <div><span class="method delete">DELETE</span> /api/admin/agents/{id}</div>
          <div style="margin-top: 8px; color: #666;">删除代理商</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/agents/credit-logs</div>
          <div style="margin-top: 8px; color: #666;">获取信用额度变更日志</div>
        </div>
      </div>

      <div class="section">
        <h2>👤 会员管理</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/members</div>
          <div style="margin-top: 8px; color: #666;">获取会员列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/members</div>
          <div style="margin-top: 8px; color: #666;">创建会员</div>
        </div>

        <div class="endpoint">
          <div><span class="method put">PUT</span> /api/admin/members/{id}</div>
          <div style="margin-top: 8px; color: #666;">更新会员信息</div>
        </div>

        <div class="endpoint">
          <div><span class="method patch">PATCH</span> /api/admin/members/{id}/balance</div>
          <div style="margin-top: 8px; color: #666;">调整会员余额</div>
        </div>

        <div class="endpoint">
          <div><span class="method delete">DELETE</span> /api/admin/members/{id}</div>
          <div style="margin-top: 8px; color: #666;">删除会员</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/members/{id}/transactions</div>
          <div style="margin-top: 8px; color: #666;">获取会员交易记录</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/members/{id}/bets</div>
          <div style="margin-top: 8px; color: #666;">获取会员投注记录</div>
        </div>
      </div>

      <div class="section">
        <h2>📢 公告管理</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/notices</div>
          <div style="margin-top: 8px; color: #666;">获取公告列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/notices</div>
          <div style="margin-top: 8px; color: #666;">创建公告</div>
        </div>

        <div class="endpoint">
          <div><span class="method put">PUT</span> /api/admin/notices/{id}</div>
          <div style="margin-top: 8px; color: #666;">更新公告</div>
        </div>

        <div class="endpoint">
          <div><span class="method delete">DELETE</span> /api/admin/notices/{id}</div>
          <div style="margin-top: 8px; color: #666;">删除公告</div>
        </div>

        <div class="endpoint">
          <div><span class="method patch">PATCH</span> /api/admin/notices/{id}/publish</div>
          <div style="margin-top: 8px; color: #666;">发布公告</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/public/notices</div>
          <div style="margin-top: 8px; color: #666;">获取前端公告列表（用户端）</div>
        </div>
      </div>

      <div class="section">
        <h2>🎲 彩票管理</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/lottery/types</div>
          <div style="margin-top: 8px; color: #666;">获取彩种列表</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/lottery/types</div>
          <div style="margin-top: 8px; color: #666;">创建彩种</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/lottery/draw/manual</div>
          <div style="margin-top: 8px; color: #666;">手动开奖</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/lottery/draw/history</div>
          <div style="margin-top: 8px; color: #666;">获取开奖历史</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/ssc/start</div>
          <div style="margin-top: 8px; color: #666;">启动分分时时彩系统</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/ssc/status</div>
          <div style="margin-top: 8px; color: #666;">获取分分时时彩系统状态</div>
        </div>
      </div>

      <div class="section">
        <h2>🎯 避开中奖控制系统</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/avoid-win/status</div>
          <div style="margin-top: 8px; color: #666;">获取避开中奖系统状态</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">概率: 约5960万分之一允许会员中奖</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/avoid-win/logs</div>
          <div style="margin-top: 8px; color: #666;">获取避开中奖决策日志</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: page, pageSize, decision_type, date_from, date_to</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/avoid-win/analysis</div>
          <div style="margin-top: 8px; color: #666;">获取会员投注分析记录</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: page, pageSize, issue_no</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/avoid-win/winners</div>
          <div style="margin-top: 8px; color: #666;">获取会员中奖记录（极少数情况）</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: page, pageSize, status, user_id</div>
        </div>

        <div class="endpoint">
          <div><span class="method post">POST</span> /api/admin/avoid-win/config</div>
          <div style="margin-top: 8px; color: #666;">更新避开中奖系统配置</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: allow_win_probability, system_enabled, min_bet_amount</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/admin/avoid-win/report</div>
          <div style="margin-top: 8px; color: #666;">获取避开中奖统计报表</div>
          <div style="margin-top: 4px; color: #888; font-size: 12px;">参数: startDate, endDate</div>
        </div>
      </div>

      <div class="section">
        <h2>🎯 用户端彩票接口</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/types</div>
          <div style="margin-top: 8px; color: #666;">获取彩种列表（用户端）</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/{code}/game-data</div>
          <div style="margin-top: 8px; color: #666;">获取彩种游戏数据</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/{code}/analysis</div>
          <div style="margin-top: 8px; color: #666;">获取投注分析数据</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/{code}/history</div>
          <div style="margin-top: 8px; color: #666;">获取开奖历史（用户端）</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/{code}/latest</div>
          <div style="margin-top: 8px; color: #666;">获取最新开奖结果</div>
        </div>

        <div class="endpoint">
          <div><span class="method get">GET</span> /api/lottery/{code}/current-issue</div>
          <div style="margin-top: 8px; color: #666;">获取当前期号信息</div>
        </div>
      </div>

      <div class="section">
        <h2>🔧 其他接口</h2>

        <div class="endpoint">
          <div><span class="method get">GET</span> /health</div>
          <div style="margin-top: 8px; color: #666;">健康检查</div>
        </div>
      </div>

      <div class="section">
        <h2>📖 使用说明</h2>
        <p>• 所有管理接口都需要JWT认证，请先调用登录接口获取访问令牌</p>
        <p>• 请求头需要包含: <code>Authorization: Bearer {access_token}</code></p>
        <p>• 默认管理员账户: <code>1019683427</code> / <code>xie080886</code></p>
        <p>• 详细的API文档请查看项目中的 <code>API_GUIDE.md</code> 文件</p>
      </div>
    </body>
    </html>
  `);
});

// 管理员认证路由
router.use('/admin/auth', authRoutes);

// 避开中奖控制系统路由（需要在adminProfileRoutes之前）
router.use('/admin/avoid-win', avoidWinRoutes);

// 管理员个人资料路由
router.use('/admin', adminProfileRoutes);

// 代理商认证路由
router.use('/agent/auth', agentAuthRoutes);

// 代理商后台路由
router.use('/agent/backend', agentBackendRoutes);

// 会员认证路由
router.use('/member/auth', memberAuthRoutes);

// 统一认证路由
router.use('/auth', unifiedAuthRoutes);

// 仪表盘路由
router.use('/admin/dashboard', dashboardRoutes);

// 代理商管理路由
router.use('/admin/agents', agentRoutes);

// 会员管理路由
router.use('/admin/members', memberRoutes);

// 路由管理
router.use('/', routeRoutes);

// 公告管理路由
router.use('/', noticeRoutes);

// 安全检查路由
router.use('/', securityRoutes);

// 报表路由
router.use('/admin/reports', reportRoutes);

// 彩票管理路由
router.use('/admin/lottery', lotteryRoutes);

// 用户端彩票路由
router.use('/lottery', userLotteryRoutes);

// 分分时时彩路由
router.use('/ssc', sscMiddleware(), createSSCRoutes(getPool()));

// 投注数据路由
router.use('/admin/bets', betRoutes);

// 登录日志路由
router.use('/login-logs', loginLogRoutes);

// IP地理位置测试API（用于前端测试IPv6支持）
router.post('/test-geoip', async (req, res) => {
  try {
    const { ip, ipVersion } = req.body;
    
    if (!ip) {
      return res.status(400).json({
        success: false,
        message: '缺少IP参数'
      });
    }

    console.log(`🧪 测试IP地理位置查询: ${ip} (${ipVersion || '未知版本'})`);
    
    const geoInfo = await getIPLocation(ip);
    
    res.json({
      success: true,
      data: {
        ip,
        ipVersion,
        ...geoInfo
      },
      message: '地理位置查询成功'
    });
  } catch (error: any) {
    console.error('❌ IP地理位置测试失败:', error);
    res.status(500).json({
      success: false,
      message: `地理位置查询失败: ${error.message}`,
      data: null
    });
  }
});

export default router;
