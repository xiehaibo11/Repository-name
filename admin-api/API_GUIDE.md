# 后端管理系统 API 使用指南

## 🚀 快速开始

### 系统信息
- **服务器地址**: http://localhost:3000
- **数据库**: PostgreSQL (密码: 123456)
- **认证方式**: JWT Bearer Token

### 超级管理员账户
- **用户名**: 1019683427
- **密码**: xie080886

## 📋 API 接口测试

### 1. 认证接口测试

#### 登录获取Token
```powershell
$response = Invoke-RestMethod -Uri "http://localhost:3000/api/admin/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"1019683427","password":"xie080886"}'
$token = $response.data.tokens.access_token
Write-Host "Token: $token"
```

#### 获取管理员资料
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/auth/profile" -Method GET -Headers @{Authorization="Bearer $token"}
```

### 2. 仪表盘接口测试

#### 获取统计数据
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/dashboard/stats" -Method GET -Headers @{Authorization="Bearer $token"}
```

#### 获取图表数据
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/dashboard/charts?period=week" -Method GET -Headers @{Authorization="Bearer $token"}
```

#### 获取活动日志
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/dashboard/activities" -Method GET -Headers @{Authorization="Bearer $token"}
```

### 3. 代理商管理接口测试

#### 创建代理商
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/agents" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"username":"agent001","nickname":"测试代理商","password":"123456","credit":10000}'
```

#### 获取代理商列表
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/agents" -Method GET -Headers @{Authorization="Bearer $token"}
```

#### 调整代理商信用额度
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/agents/1/credit" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"amount":5000,"reason":"增加信用额度测试"}'
```

#### 获取信用额度日志
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/agents/credit-logs" -Method GET -Headers @{Authorization="Bearer $token"}
```

### 4. 会员管理接口测试

#### 创建会员
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/members" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"username":"member001","nickname":"测试会员","password":"123456","agentId":1,"balance":1000}'
```

#### 获取会员列表
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/members" -Method GET -Headers @{Authorization="Bearer $token"}
```

#### 调整会员余额
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/members/1/balance" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"amount":-500,"reason":"手动扣除测试"}'
```

#### 获取会员交易记录
```powershell
Invoke-RestMethod -Uri "http://localhost:3000/api/admin/members/1/transactions" -Method GET -Headers @{Authorization="Bearer $token"}
```

## 🔧 完整测试脚本

创建一个PowerShell脚本来测试所有API：

```powershell
# 设置基础URL
$baseUrl = "http://localhost:3000/api"

# 1. 登录获取Token
Write-Host "=== 1. 登录测试 ===" -ForegroundColor Green
$loginResponse = Invoke-RestMethod -Uri "$baseUrl/admin/auth/login" -Method POST -ContentType "application/json" -Body '{"username":"1019683427","password":"xie080886"}'
$token = $loginResponse.data.tokens.access_token
Write-Host "登录成功，Token: $($token.Substring(0,50))..." -ForegroundColor Yellow

# 2. 获取仪表盘数据
Write-Host "`n=== 2. 仪表盘数据测试 ===" -ForegroundColor Green
$stats = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard/stats" -Method GET -Headers @{Authorization="Bearer $token"}
Write-Host "统计数据获取成功" -ForegroundColor Yellow

# 3. 创建代理商
Write-Host "`n=== 3. 创建代理商测试 ===" -ForegroundColor Green
$agent = Invoke-RestMethod -Uri "$baseUrl/admin/agents" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"username":"agent001","nickname":"测试代理商","password":"123456","credit":10000}'
$agentId = $agent.data.agent.id
Write-Host "代理商创建成功，ID: $agentId" -ForegroundColor Yellow

# 4. 创建会员
Write-Host "`n=== 4. 创建会员测试 ===" -ForegroundColor Green
$member = Invoke-RestMethod -Uri "$baseUrl/admin/members" -Method POST -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body "{`"username`":`"member001`",`"nickname`":`"测试会员`",`"password`":`"123456`",`"agentId`":$agentId,`"balance`":1000}"
$memberId = $member.data.member.id
Write-Host "会员创建成功，ID: $memberId" -ForegroundColor Yellow

# 5. 调整代理商信用额度
Write-Host "`n=== 5. 调整代理商信用额度测试 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/admin/agents/$agentId/credit" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"amount":5000,"reason":"增加信用额度测试"}'
Write-Host "代理商信用额度调整成功" -ForegroundColor Yellow

# 6. 调整会员余额
Write-Host "`n=== 6. 调整会员余额测试 ===" -ForegroundColor Green
Invoke-RestMethod -Uri "$baseUrl/admin/members/$memberId/balance" -Method PATCH -ContentType "application/json" -Headers @{Authorization="Bearer $token"} -Body '{"amount":-500,"reason":"手动扣除测试"}'
Write-Host "会员余额调整成功" -ForegroundColor Yellow

# 7. 获取最新统计数据
Write-Host "`n=== 7. 最新统计数据 ===" -ForegroundColor Green
$finalStats = Invoke-RestMethod -Uri "$baseUrl/admin/dashboard/stats" -Method GET -Headers @{Authorization="Bearer $token"}
Write-Host "代理商总数: $($finalStats.data.overview.totalAgents)" -ForegroundColor Cyan
Write-Host "会员总数: $($finalStats.data.overview.totalMembers)" -ForegroundColor Cyan
Write-Host "总信用额度: $($finalStats.data.overview.totalCredit)" -ForegroundColor Cyan
Write-Host "总余额: $($finalStats.data.overview.totalBalance)" -ForegroundColor Cyan

Write-Host "`n=== 所有测试完成 ===" -ForegroundColor Green
```

## 📊 数据库表结构

### 主要数据表

1. **admins** - 管理员表
2. **agents** - 代理商表
3. **members** - 会员表
4. **credit_logs** - 信用额度变更日志
5. **balance_logs** - 余额变更日志

### 表关系

- Agent (1) -> Member (N)
- Admin (1) -> CreditLog (N)
- Admin (1) -> BalanceLog (N)
- Agent (1) -> CreditLog (N)
- Member (1) -> BalanceLog (N)

## 🔒 安全特性

1. **JWT认证** - 所有API都需要有效的JWT令牌
2. **密码加密** - 使用bcrypt进行密码哈希
3. **请求限制** - 防止暴力攻击
4. **输入验证** - 防止SQL注入和XSS攻击
5. **CORS配置** - 限制跨域请求

## 🚀 部署说明

1. 确保PostgreSQL服务运行
2. 配置环境变量
3. 运行 `npm install` 安装依赖
4. 运行 `npm run dev` 启动开发服务器
5. 运行 `npm run build` 构建生产版本
6. 运行 `npm start` 启动生产服务器
