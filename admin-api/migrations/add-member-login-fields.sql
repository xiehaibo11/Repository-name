-- 添加会员登录信息字段
-- 执行时间：2025-07-24

-- 添加最后登录时间字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMP WITH TIME ZONE;

-- 添加最后登录IP字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_ip VARCHAR(45);

-- 添加最后登录地址字段
ALTER TABLE members ADD COLUMN IF NOT EXISTS last_login_location VARCHAR(255);

-- 添加注释
COMMENT ON COLUMN members.last_login_at IS '最后登录时间';
COMMENT ON COLUMN members.last_login_ip IS '最后登录IP地址（支持IPv4和IPv6）';
COMMENT ON COLUMN members.last_login_location IS '最后登录地理位置（如：中国, 江苏, 南京市）';

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_members_last_login_at ON members (last_login_at);
CREATE INDEX IF NOT EXISTS idx_members_last_login_ip ON members (last_login_ip);
