# 后端管理系统部署指南

## 📋 部署前准备

### 1. 服务器环境要求
- **操作系统**: Linux (推荐 Ubuntu 20.04+) / CentOS 7+
- **Node.js**: 18.x 或更高版本
- **PostgreSQL**: 12.x 或更高版本
- **内存**: 最少 2GB RAM
- **存储**: 最少 10GB 可用空间

### 2. 安装依赖软件

#### Ubuntu/Debian
```bash
# 更新系统
sudo apt update && sudo apt upgrade -y

# 安装 Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 安装 PostgreSQL
sudo apt install postgresql postgresql-contrib -y

# 安装 PM2 (进程管理器)
sudo npm install -g pm2
```

#### CentOS/RHEL
```bash
# 安装 Node.js 18.x
curl -fsSL https://rpm.nodesource.com/setup_18.x | sudo bash -
sudo yum install -y nodejs

# 安装 PostgreSQL
sudo yum install postgresql-server postgresql-contrib -y
sudo postgresql-setup initdb
sudo systemctl enable postgresql
sudo systemctl start postgresql

# 安装 PM2
sudo npm install -g pm2
```

## 🗄️ 数据库部署

### 1. 配置 PostgreSQL

```bash
# 切换到 postgres 用户
sudo -u postgres psql

# 在 PostgreSQL 中执行以下命令：
CREATE USER backend_admin WITH PASSWORD 'your_secure_password';
CREATE DATABASE backend_management_system OWNER backend_admin;
GRANT ALL PRIVILEGES ON DATABASE backend_management_system TO backend_admin;
\q
```

### 2. 部署数据库表结构

```bash
# 进入项目目录
cd /path/to/your/project

# 进入数据库目录
cd database

# 设置执行权限
chmod +x deploy.sh backup.sh

# 执行数据库部署
./deploy.sh production backend_management_system
```

### 3. 验证数据库部署

```bash
# 连接数据库验证
psql -h localhost -U backend_admin -d backend_management_system -c "\dt"

# 应该看到以下表：
# - admins
# - agents  
# - members
# - credit_logs
# - balance_logs
```

## 🚀 应用部署

### 1. 上传项目文件

```bash
# 创建项目目录
sudo mkdir -p /var/www/backend-management
sudo chown $USER:$USER /var/www/backend-management

# 上传项目文件到服务器
# 可以使用 scp, rsync, git clone 等方式
```

### 2. 安装依赖

```bash
cd /var/www/backend-management

# 安装 Node.js 依赖
npm install --production

# 构建项目
npm run build
```

### 3. 配置环境变量

```bash
# 复制环境配置文件
cp .env.example .env

# 编辑环境配置
nano .env
```

**重要配置项：**
```env
# 服务器配置
NODE_ENV=production
PORT=3001

# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_USER=backend_admin
DB_PASSWORD=your_secure_password
DB_NAME=backend_management_system

# JWT 配置
JWT_SECRET=your_very_secure_jwt_secret_key_here
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your_very_secure_refresh_secret_key_here
JWT_REFRESH_EXPIRES_IN=7d

# 安全配置
BCRYPT_ROUNDS=12
```

### 4. 使用 PM2 启动应用

```bash
# 创建 PM2 配置文件
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'backend-management',
    script: 'dist/server.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '1G'
  }]
};
EOF

# 创建日志目录
mkdir -p logs

# 启动应用
pm2 start ecosystem.config.js

# 保存 PM2 配置
pm2 save

# 设置开机自启
pm2 startup
```

## 🔧 Nginx 反向代理配置

### 1. 安装 Nginx

```bash
# Ubuntu/Debian
sudo apt install nginx -y

# CentOS/RHEL
sudo yum install nginx -y
```

### 2. 配置 Nginx

```bash
# 创建站点配置
sudo nano /etc/nginx/sites-available/backend-management
```

**Nginx 配置内容：**
```nginx
server {
    listen 80;
    server_name your-domain.com;  # 替换为您的域名

    # 重定向到 HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;  # 替换为您的域名

    # SSL 证书配置（需要申请 SSL 证书）
    ssl_certificate /path/to/your/certificate.crt;
    ssl_certificate_key /path/to/your/private.key;

    # 安全配置
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # 反向代理到 Node.js 应用
    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 静态文件缓存
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 安全头
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' http: https: data: blob: 'unsafe-inline'" always;
}
```

### 3. 启用站点

```bash
# 启用站点
sudo ln -s /etc/nginx/sites-available/backend-management /etc/nginx/sites-enabled/

# 测试配置
sudo nginx -t

# 重启 Nginx
sudo systemctl restart nginx
sudo systemctl enable nginx
```

## 🔒 安全配置

### 1. 防火墙配置

```bash
# Ubuntu (UFW)
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable

# CentOS (firewalld)
sudo firewall-cmd --permanent --add-service=ssh
sudo firewall-cmd --permanent --add-service=http
sudo firewall-cmd --permanent --add-service=https
sudo firewall-cmd --reload
```

### 2. 数据库安全

```bash
# 修改 PostgreSQL 配置
sudo nano /etc/postgresql/*/main/postgresql.conf

# 设置监听地址（仅本地）
listen_addresses = 'localhost'

# 重启 PostgreSQL
sudo systemctl restart postgresql
```

## 📊 监控和维护

### 1. 应用监控

```bash
# 查看应用状态
pm2 status

# 查看日志
pm2 logs backend-management

# 重启应用
pm2 restart backend-management
```

### 2. 数据库备份

```bash
# 设置定时备份
crontab -e

# 添加以下行（每天凌晨2点备份）
0 2 * * * cd /var/www/backend-management/database && ./backup.sh
```

### 3. 系统监控

```bash
# 安装监控工具
sudo apt install htop iotop -y

# 监控系统资源
htop
```

## 🚨 故障排除

### 常见问题

1. **应用无法启动**
   - 检查环境变量配置
   - 查看 PM2 日志：`pm2 logs`
   - 验证数据库连接

2. **数据库连接失败**
   - 检查 PostgreSQL 服务状态
   - 验证数据库用户权限
   - 检查防火墙设置

3. **Nginx 502 错误**
   - 确认 Node.js 应用正在运行
   - 检查端口配置
   - 查看 Nginx 错误日志

### 日志位置

- **应用日志**: `/var/www/backend-management/logs/`
- **Nginx 日志**: `/var/log/nginx/`
- **PostgreSQL 日志**: `/var/log/postgresql/`

## ✅ 部署检查清单

- [ ] 服务器环境准备完成
- [ ] PostgreSQL 安装并配置完成
- [ ] 数据库表结构部署完成
- [ ] 应用代码上传完成
- [ ] 环境变量配置完成
- [ ] PM2 启动应用成功
- [ ] Nginx 反向代理配置完成
- [ ] SSL 证书配置完成
- [ ] 防火墙配置完成
- [ ] 数据库备份脚本配置完成
- [ ] 监控配置完成

## 📞 技术支持

部署过程中如有问题，请检查：
1. 系统日志
2. 应用日志  
3. 数据库日志
4. 网络连接

或联系开发团队获取支持。
