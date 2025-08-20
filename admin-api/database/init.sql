-- 后端管理系统数据库初始化脚本
-- 创建时间: 2025-07-18
-- 版本: 1.0.0

-- 设置时区
SET timezone = 'Asia/Shanghai';

-- 创建数据库（如果不存在）
-- CREATE DATABASE backend_management_system;

-- 连接到数据库
-- \c backend_management_system;

-- 启用必要的扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. 创建管理员表
-- ============================================
CREATE TABLE IF NOT EXISTS "admins" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "email" VARCHAR(100) UNIQUE NOT NULL,
  "role" VARCHAR(20) NOT NULL DEFAULT 'admin',
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_admins_role" CHECK ("role" IN ('super_admin', 'admin')),
  CONSTRAINT "chk_admins_status" CHECK ("status" IN ('active', 'disabled'))
);

-- 管理员表索引
CREATE INDEX IF NOT EXISTS "idx_admins_username" ON "admins" ("username");
CREATE INDEX IF NOT EXISTS "idx_admins_email" ON "admins" ("email");
CREATE INDEX IF NOT EXISTS "idx_admins_status" ON "admins" ("status");
CREATE INDEX IF NOT EXISTS "idx_admins_role" ON "admins" ("role");

-- ============================================
-- 2. 创建代理商表
-- ============================================
CREATE TABLE IF NOT EXISTS "agents" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "nickname" VARCHAR(100) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_agents_credit_positive" CHECK ("credit" >= 0),
  CONSTRAINT "chk_agents_status" CHECK ("status" IN ('active', 'disabled'))
);

-- 代理商表索引
CREATE INDEX IF NOT EXISTS "idx_agents_username" ON "agents" ("username");
CREATE INDEX IF NOT EXISTS "idx_agents_status" ON "agents" ("status");
CREATE INDEX IF NOT EXISTS "idx_agents_credit" ON "agents" ("credit");
CREATE INDEX IF NOT EXISTS "idx_agents_created_at" ON "agents" ("created_at");

-- ============================================
-- 3. 创建会员表
-- ============================================
CREATE TABLE IF NOT EXISTS "members" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "nickname" VARCHAR(100) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "agent_id" INTEGER NOT NULL,
  "balance" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_members_balance_positive" CHECK ("balance" >= 0),
  CONSTRAINT "chk_members_status" CHECK ("status" IN ('active', 'disabled')),
  FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE RESTRICT
);

-- 会员表索引
CREATE INDEX IF NOT EXISTS "idx_members_username" ON "members" ("username");
CREATE INDEX IF NOT EXISTS "idx_members_agent_id" ON "members" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_members_status" ON "members" ("status");
CREATE INDEX IF NOT EXISTS "idx_members_balance" ON "members" ("balance");
CREATE INDEX IF NOT EXISTS "idx_members_created_at" ON "members" ("created_at");

-- ============================================
-- 4. 创建信用额度日志表
-- ============================================
CREATE TABLE IF NOT EXISTS "credit_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "user_type" VARCHAR(20) NOT NULL DEFAULT 'agent',
  "amount" DECIMAL(15,2) NOT NULL,
  "previous_amount" DECIMAL(15,2) NOT NULL,
  "new_amount" DECIMAL(15,2) NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'adjustment',
  "reason" TEXT NOT NULL,
  "operator_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_credit_logs_user_type" CHECK ("user_type" IN ('agent')),
  CONSTRAINT "chk_credit_logs_type" CHECK ("type" IN ('adjustment', 'system', 'admin')),
  FOREIGN KEY ("user_id") REFERENCES "agents" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("operator_id") REFERENCES "admins" ("id") ON DELETE RESTRICT
);

-- 信用额度日志表索引
CREATE INDEX IF NOT EXISTS "idx_credit_logs_user_id" ON "credit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_user_type" ON "credit_logs" ("user_type");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_type" ON "credit_logs" ("type");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_operator_id" ON "credit_logs" ("operator_id");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_created_at" ON "credit_logs" ("created_at");

-- ============================================
-- 5. 创建余额日志表
-- ============================================
CREATE TABLE IF NOT EXISTS "balance_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "user_type" VARCHAR(20) NOT NULL DEFAULT 'member',
  "amount" DECIMAL(15,2) NOT NULL,
  "previous_amount" DECIMAL(15,2) NOT NULL,
  "new_amount" DECIMAL(15,2) NOT NULL,
  "type" VARCHAR(20) NOT NULL DEFAULT 'adjustment',
  "reason" TEXT NOT NULL,
  "operator_id" INTEGER NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "chk_balance_logs_user_type" CHECK ("user_type" IN ('member')),
  CONSTRAINT "chk_balance_logs_type" CHECK ("type" IN ('adjustment', 'system', 'admin', 'transaction', 'bet')),
  FOREIGN KEY ("user_id") REFERENCES "members" ("id") ON DELETE CASCADE,
  FOREIGN KEY ("operator_id") REFERENCES "admins" ("id") ON DELETE RESTRICT
);

-- 余额日志表索引
CREATE INDEX IF NOT EXISTS "idx_balance_logs_user_id" ON "balance_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_user_type" ON "balance_logs" ("user_type");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_type" ON "balance_logs" ("type");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_operator_id" ON "balance_logs" ("operator_id");
CREATE INDEX IF NOT EXISTS "idx_balance_logs_created_at" ON "balance_logs" ("created_at");

-- ============================================
-- 6. 插入初始数据
-- ============================================

-- 插入默认超级管理员账户
-- 用户名: 1019683427
-- 邮箱: admin@backend-management.com
-- 密码: xie080886 (已使用bcrypt加密)
INSERT INTO "admins" ("username", "email", "password", "role")
VALUES ('1019683427', 'admin@backend-management.com', '$2b$12$L/2dG7rHZYeCfb.jkqId9uA5aNyPNrcxSEc2x5n7/pTfoabIepe4C', 'super_admin')
ON CONFLICT ("username") DO NOTHING;

-- ============================================
-- 7. 添加表注释
-- ============================================

-- 管理员表注释
COMMENT ON TABLE "admins" IS '管理员表';
COMMENT ON COLUMN "admins"."id" IS '主键ID';
COMMENT ON COLUMN "admins"."username" IS '用户名';
COMMENT ON COLUMN "admins"."email" IS '邮箱地址';
COMMENT ON COLUMN "admins"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "admins"."role" IS '角色：super_admin-超级管理员，admin-普通管理员';
COMMENT ON COLUMN "admins"."status" IS '状态：active-激活，disabled-禁用';

-- 代理商表注释
COMMENT ON TABLE "agents" IS '代理商表';
COMMENT ON COLUMN "agents"."id" IS '主键ID';
COMMENT ON COLUMN "agents"."username" IS '用户名（如：AA11001）';
COMMENT ON COLUMN "agents"."nickname" IS '昵称';
COMMENT ON COLUMN "agents"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "agents"."credit" IS '信用额度';
COMMENT ON COLUMN "agents"."status" IS '状态：active-激活，disabled-禁用';

-- 会员表注释
COMMENT ON TABLE "members" IS '会员表';
COMMENT ON COLUMN "members"."id" IS '主键ID';
COMMENT ON COLUMN "members"."username" IS '用户名（如：BB22001）';
COMMENT ON COLUMN "members"."nickname" IS '昵称';
COMMENT ON COLUMN "members"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "members"."agent_id" IS '所属代理商ID';
COMMENT ON COLUMN "members"."balance" IS '账户余额';
COMMENT ON COLUMN "members"."status" IS '状态：active-激活，disabled-禁用';

-- 信用额度日志表注释
COMMENT ON TABLE "credit_logs" IS '信用额度变更日志表';
COMMENT ON COLUMN "credit_logs"."user_id" IS '代理商ID';
COMMENT ON COLUMN "credit_logs"."user_type" IS '用户类型：agent';
COMMENT ON COLUMN "credit_logs"."amount" IS '变更金额（正数为增加，负数为减少）';
COMMENT ON COLUMN "credit_logs"."previous_amount" IS '变更前金额';
COMMENT ON COLUMN "credit_logs"."new_amount" IS '变更后金额';
COMMENT ON COLUMN "credit_logs"."type" IS '变更类型：adjustment-手动调整，system-系统操作，admin-管理员操作';
COMMENT ON COLUMN "credit_logs"."reason" IS '变更原因';
COMMENT ON COLUMN "credit_logs"."operator_id" IS '操作员ID（管理员ID）';

-- 余额日志表注释
COMMENT ON TABLE "balance_logs" IS '余额变更日志表';
COMMENT ON COLUMN "balance_logs"."user_id" IS '会员ID';
COMMENT ON COLUMN "balance_logs"."user_type" IS '用户类型：member';
COMMENT ON COLUMN "balance_logs"."amount" IS '变更金额（正数为增加，负数为减少）';
COMMENT ON COLUMN "balance_logs"."previous_amount" IS '变更前金额';
COMMENT ON COLUMN "balance_logs"."new_amount" IS '变更后金额';
COMMENT ON COLUMN "balance_logs"."type" IS '变更类型：adjustment-手动调整，system-系统操作，admin-管理员操作，transaction-交易，bet-投注';
COMMENT ON COLUMN "balance_logs"."reason" IS '变更原因';
COMMENT ON COLUMN "balance_logs"."operator_id" IS '操作员ID（管理员ID）';

-- 初始化完成
SELECT 'Database initialization completed successfully!' AS status;
