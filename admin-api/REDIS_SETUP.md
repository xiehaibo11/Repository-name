# Redis 安装和配置指南

## 🎯 快速安装（推荐）

### 方法一：使用自动化脚本
```powershell
# 以管理员身份运行 PowerShell，然后执行：

# 开发环境（2GB 内存）
.\scripts\setup-redis.ps1 -Environment dev -Password 123456 -MaxMemory 2gb

# 云服务器环境（4GB 内存）
.\scripts\setup-redis.ps1 -Environment production -Password 123456 -MaxMemory 4gb

# 高性能服务器（8GB 内存）
.\scripts\setup-redis.ps1 -Environment high-performance -Password 123456 -MaxMemory 8gb
```

### 方法二：手动安装

#### 1. 安装 Chocolatey（如果未安装）
```powershell
Set-ExecutionPolicy Bypass -Scope Process -Force
[System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
iex ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))
```

#### 2. 安装 Redis
```powershell
choco install redis-64 -y
```

#### 3. 启动 Redis
```powershell
# 方法1：作为服务启动
Start-Service Redis

# 方法2：手动启动
redis-server
```

#### 4. 测试连接
```powershell
redis-cli -a 123456 ping
# 应该返回: PONG
```

## 🔧 配置说明

### 当前项目配置
项目已配置为使用以下 Redis 设置：

```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=123456
REDIS_DB=0
REDIS_KEY_PREFIX=admin_api:
```

### 密码配置
Redis 已配置密码为 `123456`，适合开发和测试环境。生产环境请使用更强的密码：

1. 修改项目 `.env` 文件中的 `REDIS_PASSWORD`
2. 更新 Redis 配置文件中的 `requirepass` 设置
3. 重启 Redis 服务

### 配置文件说明
项目提供了三种环境的配置文件：

- `config/redis.conf` - 开发环境（2GB 内存）
- `config/redis-production.conf` - 云服务器（4GB 内存）
- `config/redis-high-performance.conf` - 高性能服务器（8GB 内存）

## 💾 持久化配置

### RDB + AOF 双重持久化
项目配置了 Redis 的双重持久化机制：

#### RDB 快照
- **触发条件**：
  - 900秒内至少1个键改变
  - 300秒内至少10个键改变
  - 60秒内至少10000个键改变
- **文件位置**：`./data/dump.rdb`
- **压缩**：启用 LZF 压缩
- **校验**：启用 CRC64 校验

#### AOF 日志
- **模式**：启用 AOF 持久化
- **同步策略**：每秒同步（`everysec`）
- **文件位置**：`./data/appendonly.aof`
- **重写**：自动重写，最小64MB
- **混合模式**：启用 RDB+AOF 混合持久化

#### 数据安全性
- **RDB**：适合备份，恢复速度快
- **AOF**：数据安全性高，最多丢失1秒数据
- **混合模式**：结合两者优势，推荐生产环境使用

## 🚀 验证安装

### 1. 检查 Redis 状态
```powershell
# 检查服务状态
Get-Service Redis

# 检查进程
Get-Process redis-server
```

### 2. 测试基本操作
```powershell
# 连接到 Redis（需要密码）
redis-cli -a 123456

# 在 Redis CLI 中执行：
127.0.0.1:6379> set test "Hello Redis"
127.0.0.1:6379> get test
127.0.0.1:6379> del test
127.0.0.1:6379> info memory
127.0.0.1:6379> config get maxmemory
127.0.0.1:6379> exit
```

### 3. 测试项目连接
启动后端服务，查看日志中是否有：
```
✅ Redis 连接成功
```

## 🛠️ 常见问题

### Q: Redis 服务启动失败
**A:** 尝试以下解决方案：
1. 以管理员身份运行 PowerShell
2. 手动启动：`redis-server`
3. 检查端口 6379 是否被占用：`netstat -an | findstr 6379`

### Q: 连接被拒绝
**A:** 检查：
1. Redis 服务是否正在运行
2. 防火墙设置
3. Redis 配置文件中的绑定地址

### Q: 项目提示 Redis 连接失败
**A:** 这是正常的，项目设计为在没有 Redis 的情况下也能运行：
- 有 Redis：使用缓存功能，性能更好
- 无 Redis：功能正常，但没有缓存

## 📋 Redis 管理命令

### 启动和停止
```powershell
# 启动服务
Start-Service Redis

# 停止服务
Stop-Service Redis

# 重启服务
Restart-Service Redis

# 手动启动（使用配置文件）
redis-server "C:\ProgramData\chocolatey\lib\redis-64\tools\redis.windows.conf"

# 优雅停止
redis-cli -a 123456 shutdown
```

### 监控和调试
```powershell
# 查看 Redis 信息
redis-cli -a 123456 info

# 查看内存使用情况
redis-cli -a 123456 info memory

# 查看持久化信息
redis-cli -a 123456 info persistence

# 监控实时命令
redis-cli -a 123456 monitor

# 查看所有键（开发环境）
redis-cli -a 123456 keys "*"

# 查看慢查询日志
redis-cli -a 123456 slowlog get 10

# 清空数据库（谨慎使用）
redis-cli -a 123456 flushdb
```

### 持久化管理
```powershell
# 手动触发 RDB 保存
redis-cli -a 123456 bgsave

# 手动触发 AOF 重写
redis-cli -a 123456 bgrewriteaof

# 查看最后保存时间
redis-cli -a 123456 lastsave

# 检查 AOF 文件
redis-check-aof appendonly.aof

# 检查 RDB 文件
redis-check-rdb dump.rdb
```

## 🔒 生产环境注意事项

1. **设置密码**：生产环境必须设置强密码
2. **绑定地址**：限制只允许特定 IP 访问
3. **持久化**：配置 RDB 或 AOF 持久化
4. **内存限制**：设置最大内存使用量
5. **日志配置**：配置适当的日志级别

## 📞 获取帮助

如果遇到问题：
1. 查看 Redis 日志文件
2. 检查 Windows 事件查看器
3. 参考 Redis 官方文档：https://redis.io/documentation
4. 检查项目后端日志中的 Redis 相关信息
