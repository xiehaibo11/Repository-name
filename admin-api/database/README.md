# 后端管理系统数据库文档

## 📋 概述

本文档描述了后端管理系统的数据库结构、部署方法和维护指南。

## 🗄️ 数据库结构

### 表格概览

| 表名 | 说明 | 主要字段 |
|------|------|----------|
| `admins` | 管理员表 | id, username, password, role, status |
| `agents` | 代理商表 | id, username, nickname, credit, status |
| `members` | 会员表 | id, username, nickname, agent_id, balance |
| `credit_logs` | 信用额度日志 | user_id, amount, previous_amount, new_amount |
| `balance_logs` | 余额日志 | user_id, amount, previous_amount, new_amount |

### 详细表结构

#### 1. admins (管理员表)
```sql
CREATE TABLE "admins" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,     -- 用户名
  "password" VARCHAR(255) NOT NULL,           -- 密码（bcrypt加密）
  "role" VARCHAR(20) DEFAULT 'admin',         -- 角色：super_admin, admin
  "status" VARCHAR(20) DEFAULT 'active',      -- 状态：active, inactive
  "last_login_at" TIMESTAMP WITH TIME ZONE,   -- 最后登录时间
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 2. agents (代理商表)
```sql
CREATE TABLE "agents" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,     -- 用户名（如：AA11001）
  "nickname" VARCHAR(100) NOT NULL,           -- 昵称
  "password" VARCHAR(255) NOT NULL,           -- 密码（bcrypt加密）
  "credit" DECIMAL(15,2) DEFAULT 0.00,        -- 信用额度
  "status" VARCHAR(20) DEFAULT 'active',      -- 状态：active, inactive
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### 3. members (会员表)
```sql
CREATE TABLE "members" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,     -- 用户名（如：BB22001）
  "nickname" VARCHAR(100) NOT NULL,           -- 昵称
  "password" VARCHAR(255) NOT NULL,           -- 密码（bcrypt加密）
  "agent_id" INTEGER NOT NULL,                -- 所属代理商ID
  "balance" DECIMAL(15,2) DEFAULT 0.00,       -- 账户余额
  "status" VARCHAR(20) DEFAULT 'active',      -- 状态：active, inactive
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY ("agent_id") REFERENCES "agents" ("id")
);
```

#### 4. credit_logs (信用额度日志表)
```sql
CREATE TABLE "credit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,                 -- 代理商ID
  "user_type" VARCHAR(20) DEFAULT 'agent',    -- 用户类型
  "amount" DECIMAL(15,2) NOT NULL,            -- 变更金额
  "previous_amount" DECIMAL(15,2) NOT NULL,   -- 变更前金额
  "new_amount" DECIMAL(15,2) NOT NULL,        -- 变更后金额
  "type" VARCHAR(20) DEFAULT 'adjustment',    -- 变更类型
  "reason" TEXT NOT NULL,                     -- 变更原因
  "operator_id" INTEGER NOT NULL,             -- 操作员ID
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "agents" ("id"),
  FOREIGN KEY ("operator_id") REFERENCES "admins" ("id")
);
```

#### 5. balance_logs (余额日志表)
```sql
CREATE TABLE "balance_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,                 -- 会员ID
  "user_type" VARCHAR(20) DEFAULT 'member',   -- 用户类型
  "amount" DECIMAL(15,2) NOT NULL,            -- 变更金额
  "previous_amount" DECIMAL(15,2) NOT NULL,   -- 变更前金额
  "new_amount" DECIMAL(15,2) NOT NULL,        -- 变更后金额
  "type" VARCHAR(20) DEFAULT 'adjustment',    -- 变更类型
  "reason" TEXT NOT NULL,                     -- 变更原因
  "operator_id" INTEGER,                      -- 操作员ID（可为空）
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  FOREIGN KEY ("user_id") REFERENCES "members" ("id"),
  FOREIGN KEY ("operator_id") REFERENCES "admins" ("id")
);
```

## 🚀 部署指南

### 1. 环境要求
- PostgreSQL 12+
- 操作系统：Linux/macOS/Windows

### 2. 快速部署
```bash
# 1. 进入数据库目录
cd database

# 2. 设置执行权限（Linux/macOS）
chmod +x deploy.sh backup.sh

# 3. 执行部署脚本
./deploy.sh production backend_management_system
```

### 3. 手动部署
```bash
# 1. 创建数据库
createdb backend_management_system

# 2. 执行初始化脚本
psql -d backend_management_system -f init.sql

# 3. 执行迁移文件
psql -d backend_management_system -f migrations/001_create_admins_table.sql
psql -d backend_management_system -f migrations/002_create_agents_table.sql
# ... 依次执行所有迁移文件
```

## 🔧 维护指南

### 1. 数据备份
```bash
# 自动备份（推荐）
./backup.sh backend_management_system

# 手动备份
pg_dump backend_management_system > backup_$(date +%Y%m%d).sql
```

### 2. 数据恢复
```bash
# 从备份恢复
psql -d backend_management_system < backup_file.sql
```

### 3. 性能优化
- 定期执行 `VACUUM ANALYZE` 清理和分析表
- 监控慢查询日志
- 根据查询模式添加适当的索引

## 📊 默认数据

### 默认管理员账户
- **用户名**: `1019683427`
- **密码**: `xie080886`
- **角色**: `super_admin`

## 🔍 常用查询

### 查看表结构
```sql
\d+ table_name
```

### 查看所有表
```sql
\dt
```

### 查看索引
```sql
\di
```

### 统计信息
```sql
-- 查看各表记录数
SELECT 
    schemaname,
    tablename,
    n_tup_ins as inserts,
    n_tup_upd as updates,
    n_tup_del as deletes
FROM pg_stat_user_tables;
```

## ⚠️ 注意事项

1. **密码安全**: 所有密码都使用 bcrypt 加密存储
2. **外键约束**: 删除代理商前必须先删除其下属会员
3. **数据完整性**: 所有金额字段都有非负约束
4. **时区设置**: 所有时间字段使用 `Asia/Shanghai` 时区
5. **备份策略**: 建议每日自动备份，保留7天历史备份

## 📞 技术支持

如有问题，请联系开发团队或查看项目文档。
