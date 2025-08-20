-- 添加管理员个人资料字段
-- 执行时间：2024-07-22

-- 添加昵称字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS nickname VARCHAR(50);

-- 添加手机号字段  
ALTER TABLE admins ADD COLUMN IF NOT EXISTS phone VARCHAR(20);

-- 添加头像字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS avatar VARCHAR(255);

-- 添加最后登录时间字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP;

-- 添加最后登录IP字段
ALTER TABLE admins ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- 修改email字段为可空（如果需要）
ALTER TABLE admins ALTER COLUMN email DROP NOT NULL;

-- 添加注释
COMMENT ON COLUMN admins.nickname IS '管理员昵称';
COMMENT ON COLUMN admins.phone IS '手机号码';
COMMENT ON COLUMN admins.avatar IS '头像文件路径';
COMMENT ON COLUMN admins.last_login_at IS '最后登录时间';
COMMENT ON COLUMN admins.last_login_ip IS '最后登录IP地址';

-- 查看表结构
\d admins;
