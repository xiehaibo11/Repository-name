-- 创建会员表
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
  FOREIGN KEY ("agent_id") REFERENCES "agents" ("id") ON DELETE RESTRICT
);

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_members_username" ON "members" ("username");
CREATE INDEX IF NOT EXISTS "idx_members_agent_id" ON "members" ("agent_id");
CREATE INDEX IF NOT EXISTS "idx_members_status" ON "members" ("status");
CREATE INDEX IF NOT EXISTS "idx_members_balance" ON "members" ("balance");
CREATE INDEX IF NOT EXISTS "idx_members_created_at" ON "members" ("created_at");

-- 添加约束
ALTER TABLE "members" ADD CONSTRAINT "chk_members_balance_positive" CHECK ("balance" >= 0);
ALTER TABLE "members" ADD CONSTRAINT "chk_members_status" CHECK ("status" IN ('active', 'disabled'));

-- 添加注释
COMMENT ON TABLE "members" IS '会员表';
COMMENT ON COLUMN "members"."id" IS '主键ID';
COMMENT ON COLUMN "members"."username" IS '用户名';
COMMENT ON COLUMN "members"."nickname" IS '昵称';
COMMENT ON COLUMN "members"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "members"."agent_id" IS '所属代理商ID';
COMMENT ON COLUMN "members"."balance" IS '账户余额';
COMMENT ON COLUMN "members"."status" IS '状态：active-激活，disabled-禁用';
COMMENT ON COLUMN "members"."created_at" IS '创建时间';
COMMENT ON COLUMN "members"."updated_at" IS '更新时间';
