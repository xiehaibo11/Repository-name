# ⚠️ 端口管理器 - 开发工具

## 🚨 重要警告

**此功能包含危险操作，仅限开发环境使用！**

- ✅ 开发环境：可以使用，提高开发效率
- ❌ 生产环境：**必须禁用**，否则可能造成系统不稳定

## 📋 功能说明

### 自动端口清理
- 检测端口占用情况
- 自动终止占用端口的进程
- 支持开发环境快速重启

### 安全检查
- 生产环境自动禁用危险功能
- 配置文件安全检查
- 环境变量验证

## 🔧 使用方法

### 开发环境

```bash
# 方法1：使用安全启动脚本（推荐）
npm run dev:safe

# 方法2：直接启动（需要手动处理端口冲突）
npm run dev

# 手动清理端口
npm run kill-port
```

### 生产环境

```bash
# 安全检查
npm run security-check

# 生产环境启动
npm run prod

# 部署前检查（包含安全检查和构建）
npm run predeploy
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 开发环境 | 生产环境 | 说明 |
|--------|----------|----------|------|
| `ENABLE_DEV_PORT_KILLER` | `true` | `false` | 启用端口清理器 |
| `AUTO_KILL_PORT_PROCESS` | `true` | `false` | 自动杀死进程 |
| `NODE_ENV` | `development` | `production` | 环境标识 |

### 配置文件

- `.env` - 开发环境配置
- `.env.production` - 生产环境配置

## 🔒 安全措施

### 1. 环境检查
```javascript
// 只在开发环境启用
const isDevelopment = process.env.NODE_ENV === 'development';
const devKillerEnabled = process.env.ENABLE_DEV_PORT_KILLER === 'true';
```

### 2. 多重验证
- 环境变量检查
- 配置文件验证
- 运行时安全检查

### 3. 自动禁用
生产环境启动时自动禁用所有危险功能

## 🚀 启动流程

### 开发环境
1. 显示端口管理器状态
2. 检查端口占用
3. 自动清理占用进程（如果启用）
4. 启动服务器

### 生产环境
1. 强制禁用危险功能
2. 安全端口检查
3. 启动服务器

## 📊 安全检查

运行安全检查：
```bash
npm run security-check
```

检查项目：
- ✅ 环境变量配置
- ✅ 配置文件安全性
- ✅ 弱密码检查（不包括用户自定义密码）
- ✅ JWT密钥检查

## 🛠️ 故障排除

### 端口仍被占用
```bash
# 手动检查端口
netstat -ano | findstr :3001

# 手动终止进程
taskkill /PID <进程ID> /F
```

### 权限不足
以管理员身份运行PowerShell或命令提示符

### 生产环境错误启用
1. 检查环境变量
2. 运行安全检查
3. 修改配置文件

## 📝 最佳实践

### 开发时
1. 使用 `npm run dev:safe` 启动
2. 定期运行安全检查
3. 不要在共享服务器上使用

### 部署前
1. 运行 `npm run security-check`
2. 确保所有危险功能已禁用
3. 使用生产环境配置

### 生产环境
1. 使用 `npm run prod` 启动
2. 定期检查配置安全性
3. 监控系统日志

## ⚡ 快速参考

```bash
# 开发启动
npm run dev:safe

# 生产启动
npm run prod

# 安全检查
npm run security-check

# 清理端口
npm run kill-port

# 部署检查
npm run predeploy
```

---

**记住：安全第一！生产环境必须禁用所有危险功能！**
