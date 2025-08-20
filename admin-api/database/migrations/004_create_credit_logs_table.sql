-- 创建信用额度日志表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_credit_logs_user_id" ON "credit_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_user_type" ON "credit_logs" ("user_type");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_type" ON "credit_logs" ("type");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_operator_id" ON "credit_logs" ("operator_id");
CREATE INDEX IF NOT EXISTS "idx_credit_logs_created_at" ON "credit_logs" ("created_at");

-- 添加注释
COMMENT ON TABLE "credit_logs" IS '信用额度变更日志表';
COMMENT ON COLUMN "credit_logs"."id" IS '主键ID';
COMMENT ON COLUMN "credit_logs"."user_id" IS '用户ID（代理商ID）';
COMMENT ON COLUMN "credit_logs"."user_type" IS '用户类型：agent-代理商';
COMMENT ON COLUMN "credit_logs"."amount" IS '变更金额（正数为增加，负数为减少）';
COMMENT ON COLUMN "credit_logs"."previous_amount" IS '变更前金额';
COMMENT ON COLUMN "credit_logs"."new_amount" IS '变更后金额';
COMMENT ON COLUMN "credit_logs"."type" IS '变更类型：adjustment-手动调整，system-系统操作，admin-管理员操作';
COMMENT ON COLUMN "credit_logs"."reason" IS '变更原因';
COMMENT ON COLUMN "credit_logs"."operator_id" IS '操作员ID（管理员ID）';
COMMENT ON COLUMN "credit_logs"."created_at" IS '创建时间';
COMMENT ON COLUMN "credit_logs"."updated_at" IS '更新时间';
