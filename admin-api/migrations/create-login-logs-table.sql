-- 创建登录日志表
-- 执行时间：2025-07-24

-- 创建登录日志表
CREATE TABLE IF NOT EXISTS login_logs (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    user_type VARCHAR(20) NOT NULL CHECK (user_type IN ('member', 'agent', 'admin')),
    username VARCHAR(50) NOT NULL,
    login_ip VARCHAR(45) NOT NULL,
    login_location VARCHAR(255),
    country VARCHAR(100),
    region VARCHAR(100),
    city VARCHAR(100),
    isp VARCHAR(255),
    user_agent TEXT,
    login_status VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (login_status IN ('success', 'failed')),
    failure_reason VARCHAR(255),
    login_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_login_logs_user_id ON login_logs (user_id);
CREATE INDEX IF NOT EXISTS idx_login_logs_user_type ON login_logs (user_type);
CREATE INDEX IF NOT EXISTS idx_login_logs_username ON login_logs (username);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_ip ON login_logs (login_ip);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_time ON login_logs (login_time);
CREATE INDEX IF NOT EXISTS idx_login_logs_login_status ON login_logs (login_status);

-- 创建复合索引
CREATE INDEX IF NOT EXISTS idx_login_logs_user_time ON login_logs (user_id, user_type, login_time DESC);
CREATE INDEX IF NOT EXISTS idx_login_logs_ip_time ON login_logs (login_ip, login_time DESC);

-- 添加注释
COMMENT ON TABLE login_logs IS '用户登录日志表';
COMMENT ON COLUMN login_logs.id IS '日志ID';
COMMENT ON COLUMN login_logs.user_id IS '用户ID';
COMMENT ON COLUMN login_logs.user_type IS '用户类型：member-会员, agent-代理商, admin-管理员';
COMMENT ON COLUMN login_logs.username IS '用户名';
COMMENT ON COLUMN login_logs.login_ip IS '登录IP地址';
COMMENT ON COLUMN login_logs.login_location IS '登录地理位置（完整地址）';
COMMENT ON COLUMN login_logs.country IS '国家';
COMMENT ON COLUMN login_logs.region IS '省份/州';
COMMENT ON COLUMN login_logs.city IS '城市';
COMMENT ON COLUMN login_logs.isp IS '网络服务提供商';
COMMENT ON COLUMN login_logs.user_agent IS '用户代理字符串';
COMMENT ON COLUMN login_logs.login_status IS '登录状态：success-成功, failed-失败';
COMMENT ON COLUMN login_logs.failure_reason IS '登录失败原因';
COMMENT ON COLUMN login_logs.login_time IS '登录时间';
COMMENT ON COLUMN login_logs.created_at IS '记录创建时间';
