-- 创建代理商表
CREATE TABLE IF NOT EXISTS "agents" (
  "id" SERIAL PRIMARY KEY,
  "username" VARCHAR(50) UNIQUE NOT NULL,
  "nickname" VARCHAR(100) NOT NULL,
  "password" VARCHAR(255) NOT NULL,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0.00,
  "status" VARCHAR(20) NOT NULL DEFAULT 'active',
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_agents_username" ON "agents" ("username");
CREATE INDEX IF NOT EXISTS "idx_agents_status" ON "agents" ("status");
CREATE INDEX IF NOT EXISTS "idx_agents_credit" ON "agents" ("credit");
CREATE INDEX IF NOT EXISTS "idx_agents_created_at" ON "agents" ("created_at");

-- 添加约束
ALTER TABLE "agents" ADD CONSTRAINT "chk_agents_credit_positive" CHECK ("credit" >= 0);
ALTER TABLE "agents" ADD CONSTRAINT "chk_agents_status" CHECK ("status" IN ('active', 'disabled'));

-- 添加注释
COMMENT ON TABLE "agents" IS '代理商表';
COMMENT ON COLUMN "agents"."id" IS '主键ID';
COMMENT ON COLUMN "agents"."username" IS '用户名';
COMMENT ON COLUMN "agents"."nickname" IS '昵称';
COMMENT ON COLUMN "agents"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "agents"."credit" IS '信用额度';
COMMENT ON COLUMN "agents"."status" IS '状态：active-激活，disabled-禁用';
COMMENT ON COLUMN "agents"."created_at" IS '创建时间';
COMMENT ON COLUMN "agents"."updated_at" IS '更新时间';
