# Redis 自动启动配置指南

## 🎯 概述

为了解决 Redis 需要单独启动的问题，我们提供了多种自动化启动方案，让您可以一键启动整个开发环境。

## 🚀 启动方式

### **方式1: 使用批处理文件（推荐）**

#### Windows 批处理文件
```bash
# 双击运行或在命令行执行
.\start-dev.bat
```

#### PowerShell 脚本
```powershell
# 在 PowerShell 中运行
.\start-dev.ps1

# 跳过 Redis 检查
.\start-dev.ps1 -SkipRedis

# 详细输出
.\start-dev.ps1 -Verbose
```

### **方式2: 使用 npm 脚本**

```bash
# 自动启动 Redis + 后端服务
npm run dev:with-redis

# 使用 concurrently 同时运行
npm run dev:full

# 仅启动后端（需要手动启动 Redis）
npm run dev
```

### **方式3: 使用 Node.js 脚本**

```bash
# 智能启动脚本
node scripts/start-with-redis.js
```

## ⚙️ 配置选项

### **环境变量配置**

在 `.env` 文件中配置：

```env
# Redis 自动启动（默认启用）
REDIS_AUTO_START=true

# Redis 连接配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=123456
REDIS_DB=0
REDIS_KEY_PREFIX=admin_api:
```

### **配置说明**

- `REDIS_AUTO_START=true`: 启用 Redis 自动启动
- `REDIS_AUTO_START=false`: 禁用 Redis 自动启动，需要手动启动

## 🔧 工作原理

### **自动启动流程**

1. **检查 Redis 状态**: 使用 `redis-cli ping` 检查 Redis 是否运行
2. **自动启动**: 如果 Redis 未运行，自动执行 `redis-server redis-dev.conf`
3. **验证连接**: 启动后验证 Redis 连接是否正常
4. **启动后端**: 启动 Node.js 后端服务
5. **优雅关闭**: Ctrl+C 时同时关闭所有服务

### **容错机制**

- **Redis 启动失败**: 后端服务仍会启动，但在无缓存模式下运行
- **连接超时**: 10秒超时后继续启动后端服务
- **进程管理**: 自动管理 Redis 进程，避免重复启动

## 📋 使用示例

### **开发环境启动**

```bash
# 方法1: 使用批处理文件（最简单）
.\start-dev.bat

# 方法2: 使用 PowerShell
.\start-dev.ps1

# 方法3: 使用 npm
npm run dev:with-redis
```

### **生产环境部署**

```bash
# 禁用自动启动，手动管理 Redis
REDIS_AUTO_START=false npm start
```

## 🛠️ 故障排除

### **常见问题**

#### **1. Redis 启动失败**
```
❌ Redis 启动失败: spawn redis-server ENOENT
```

**解决方案**:
- 确保已安装 Redis: `redis-server --version`
- 运行安装脚本: `.\scripts\setup-redis.ps1`

#### **2. 端口被占用**
```
❌ Redis 启动失败: Address already in use
```

**解决方案**:
- 检查端口占用: `netstat -ano | findstr :6379`
- 停止现有 Redis: `redis-cli -a 123456 shutdown`

#### **3. 权限问题**
```
❌ Redis 启动失败: Permission denied
```

**解决方案**:
- 以管理员身份运行 PowerShell
- 检查文件权限

### **手动操作**

#### **手动启动 Redis**
```bash
# 启动 Redis
redis-server redis-dev.conf

# 检查状态
redis-cli -a 123456 ping

# 停止 Redis
redis-cli -a 123456 shutdown
```

#### **手动启动后端**
```bash
# 启动后端服务
npm run dev
```

## 📊 监控和管理

### **Redis 状态检查**

```bash
# 检查 Redis 状态
npm run redis:status

# 查看 Redis 信息
redis-cli -a 123456 info server

# 查看内存使用
redis-cli -a 123456 info memory
```

### **进程管理**

```bash
# 查看 Redis 进程
tasklist | findstr redis

# 强制停止 Redis
taskkill /f /im redis-server.exe
```

## 🎯 最佳实践

### **开发环境**

1. **使用自动启动**: 设置 `REDIS_AUTO_START=true`
2. **使用批处理文件**: 最简单的启动方式
3. **监控日志**: 观察启动日志，确保服务正常

### **生产环境**

1. **禁用自动启动**: 设置 `REDIS_AUTO_START=false`
2. **系统服务**: 将 Redis 配置为系统服务
3. **监控告警**: 配置 Redis 监控和告警

### **团队协作**

1. **统一配置**: 团队使用相同的 Redis 配置
2. **文档更新**: 及时更新配置文档
3. **脚本共享**: 共享启动脚本和配置文件

## 🔗 相关文件

- `start-dev.bat` - Windows 批处理启动脚本
- `start-dev.ps1` - PowerShell 启动脚本
- `scripts/start-with-redis.js` - Node.js 智能启动脚本
- `src/utils/redisAutoStart.ts` - Redis 自动启动工具类
- `redis-dev.conf` - Redis 开发环境配置
- `.env` - 环境变量配置

## 📞 技术支持

如果遇到问题，请检查：

1. **Redis 安装**: 确保 Redis 已正确安装
2. **配置文件**: 检查 `redis-dev.conf` 配置
3. **环境变量**: 验证 `.env` 文件配置
4. **端口占用**: 确保 6379 端口未被占用
5. **权限问题**: 确保有足够的执行权限

---

**🎉 现在您可以一键启动整个开发环境，无需手动管理 Redis！**
