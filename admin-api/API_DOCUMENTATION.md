# 📃 Backend Management API Documentation

## ⚙️ Server Configuration (`.env`)

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/backend_management
DB_NAME=backend_management

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-12345
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production-67890
JWT_REFRESH_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Logging
LOG_LEVEL=info
LOG_FILE=logs/app.log

# CORS
CORS_ORIGIN=http://localhost:3001

# Admin Default Credentials (for initial setup)
DEFAULT_ADMIN_USERNAME=admin
DEFAULT_ADMIN_PASSWORD=admin123
DEFAULT_ADMIN_EMAIL=admin@example.com
```

---

## 🔄 Development Workflow

### 🏁 项目搭建流程

1. 克隆项目仓库：`git clone <repo-url>`
2. 安装依赖：`npm install`
3. 配置环境变量：复制 `.env.example` 并重命名为 `.env`，根据需求修改内容
4. 启动开发服务：`npm run dev`
5. 初始化数据库结构（如有迁移工具）：`npm run db:init`

### 🧪 测试流程

```bash
npm run test
```

使用 Jest + Supertest 支持单元测试、集成测试。

### 🔐 身份验证机制

* 登录成功返回 `access_token` 和 `refresh_token`
* 所有受保护接口需附带 `Authorization: Bearer <access_token>`
* 支持 Token 刷新机制

### 📁 项目结构建议

```
src/
├── controllers/         // 控制器
├── models/              // Mongoose 数据模型
├── routes/              // 路由定义
├── middleware/          // 中间件逻辑
├── services/            // 业务逻辑层
├── utils/               // 工具函数
├── config/              // 配置管理
├── tests/               // 测试用例
├── app.ts               // 应用主入口
└── server.ts            // 启动服务器
```

### 📦 依赖管理约定

* 使用 `npm` 锁定依赖版本
* 所有新增依赖请在 PR 中说明用途

### 🧩 代码规范

* 使用 Prettier + ESLint 统一代码风格
* 所有 PR 须通过 lint 检查与测试

### 🚀 部署建议

* 使用 `pm2` 守护进程
* 使用 Nginx 配置反向代理及 HTTPS
* MongoDB 使用 ReplicaSet 及权限控制
* 日志输出至 logs 目录，并设置 logrotate
* 环境变量使用 dotenv + dotenv-safe 管理

### 🔄 CI/CD 建议

* 使用 GitHub Actions 或 GitLab CI 实现自动部署
* 主要流程包含：安装依赖、测试、构建、部署、通知

---

## 🔗 Authentication

| Method | Endpoint                  | Description  | Auth Required |
| ------ | ------------------------- | ------------ | ------------- |
| POST   | `/api/admin/auth/login`   | Admin login  | No            |
| POST   | `/api/admin/auth/logout`  | Admin logout | Yes           |
| GET    | `/api/admin/auth/profile` | Get profile  | Yes           |
| POST   | `/api/admin/auth/refresh` | Refresh JWT  | No            |

---

## 📊 Dashboard

| Method | Endpoint                          | Description   | Auth |
| ------ | --------------------------------- | ------------- | ---- |
| GET    | `/api/admin/dashboard/stats`      | Summary stats | Yes  |
| GET    | `/api/admin/dashboard/charts`     | Chart data    | Yes  |
| GET    | `/api/admin/dashboard/activities` | System logs   | Yes  |

---

## 👨‍💳 Agent Management

| Method | Endpoint                        | Description                       | Auth |
| ------ | ------------------------------- | --------------------------------- | ---- |
| GET    | `/api/admin/agents`             | List agents                       | Yes  |
| POST   | `/api/admin/agents`             | Create agent                      | Yes  |
| PUT    | `/api/admin/agents/:id`         | Update agent                      | Yes  |
| DELETE | `/api/admin/agents/:id`         | Delete agent                      | Yes  |
| PATCH  | `/api/admin/agents/:id/credit`  | Adjust credit (positive/negative) | Yes  |
| GET    | `/api/admin/agents/credit-logs` | Credit change logs                | Yes  |

---

## 👥 Member Management

| Method | Endpoint                              | Description          | Auth |
| ------ | ------------------------------------- | -------------------- | ---- |
| GET    | `/api/admin/members`                  | List members         | Yes  |
| POST   | `/api/admin/members`                  | Create member        | Yes  |
| PUT    | `/api/admin/members/:id`              | Update member        | Yes  |
| DELETE | `/api/admin/members/:id`              | Delete member        | Yes  |
| PATCH  | `/api/admin/members/:id/balance`      | Adjust balance (+/-) | Yes  |
| GET    | `/api/admin/members/:id/transactions` | View transactions    | Yes  |
| GET    | `/api/admin/members/:id/bets`         | View bets            | Yes  |

---

## 💳 Credit & Balance API

统一为信用额度管理接口。

### PATCH `/api/admin/agents/:id/credit`

```json
{
  "amount": 1000,
  "reason": "Manual credit increase"
}
```

### PATCH `/api/admin/members/:id/balance`

```json
{
  "amount": -500,
  "reason": "Manual deduction"
}
```

---

## 🔍 Common Query Params

| Param                    | Type   | Description              |
| ------------------------ | ------ | ------------------------ |
| `page`                   | number | Page number (default: 1) |
| `limit`                  | number | Page size (default: 20)  |
| `status`                 | string | Account status filter    |
| `search`                 | string | Keyword search           |
| `start_date`, `end_date` | string | Date filters             |

---

## 📢 Response Format

### Success

```json
{
  "status": "success",
  "message": "Operation successful",
  "data": {}
}
```

### Error

```json
{
  "status": "error",
  "message": "Invalid credentials",
  "code": "AUTH_INVALID"
}
```

---

## 🔐 Auth Header

```
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

---

## 💡 Entities (Database Schema)

### Admin

```ts
{
  _id: ObjectId,
  username: string,
  password: string (hashed),
  email: string,
  role: 'super_admin' | 'admin',
  status: 'active' | 'disabled',
  createdAt: Date,
  updatedAt: Date
}
```

### Agent

```ts
{
  _id: ObjectId,
  username: string,
  nickname: string,
  password: string (hashed),
  credit: number,
  status: 'active' | 'disabled',
  createdAt: Date,
  updatedAt: Date
}
```

### Member

```ts
{
  _id: ObjectId,
  username: string,
  nickname: string,
  password: string (hashed),
  balance: number,
  agentId: ObjectId,
  status: 'active' | 'disabled',
  createdAt: Date,
  updatedAt: Date
}
```

### CreditLog / BalanceLog

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  role: 'agent' | 'member',
  amount: number,
  type: 'adjustment' | 'system' | 'admin',
  reason: string,
  createdAt: Date
}
```

---

## 🔢 Status Codes

| Code | Meaning      |
| ---- | ------------ |
| 200  | Success      |
| 400  | Bad Request  |
| 401  | Unauthorized |
| 403  | Forbidden    |
| 404  | Not Found    |
| 500  | Server Error |

---

## 🔧 Ready for Extensions

未来支持扩展模块：

* 🎮 Games
* 🎲 Lottery
* 💰 Transactions
* 💬 Chat System
* 📢 Notices
* ⚙️ Settings
* 📈 Analytics
* 🧾 Reports
* 🧑‍🤝‍🧑 Team Roles & Permissions
