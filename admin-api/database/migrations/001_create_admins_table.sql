-- 创建管理员表
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

-- 创建索引
CREATE INDEX IF NOT EXISTS "idx_admins_username" ON "admins" ("username");
CREATE INDEX IF NOT EXISTS "idx_admins_email" ON "admins" ("email");
CREATE INDEX IF NOT EXISTS "idx_admins_status" ON "admins" ("status");
CREATE INDEX IF NOT EXISTS "idx_admins_role" ON "admins" ("role");

-- 添加注释
COMMENT ON TABLE "admins" IS '管理员表';
COMMENT ON COLUMN "admins"."id" IS '主键ID';
COMMENT ON COLUMN "admins"."username" IS '用户名';
COMMENT ON COLUMN "admins"."email" IS '邮箱地址';
COMMENT ON COLUMN "admins"."password" IS '密码（bcrypt加密）';
COMMENT ON COLUMN "admins"."role" IS '角色：super_admin-超级管理员，admin-普通管理员';
COMMENT ON COLUMN "admins"."status" IS '状态：active-激活，disabled-禁用';
COMMENT ON COLUMN "admins"."created_at" IS '创建时间';
COMMENT ON COLUMN "admins"."updated_at" IS '更新时间';

-- 插入默认超级管理员账户（密码：xie080886）
INSERT INTO "admins" ("username", "email", "password", "role")
VALUES ('1019683427', 'admin@backend-management.com', '$2b$12$L/2dG7rHZYeCfb.jkqId9uA5aNyPNrcxSEc2x5n7/pTfoabIepe4C', 'super_admin')
ON CONFLICT ("username") DO NOTHING;
