-- Lottery Management System Database Structure
-- Created: 2025-01-21

-- 1. Lottery Types Table (lottery_types)
CREATE TABLE IF NOT EXISTS lottery_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,                    -- Lottery name
    code VARCHAR(50) NOT NULL UNIQUE,                     -- Lottery code
    category VARCHAR(50) NOT NULL,                        -- Category (ssc, k3, pk10, 11x5, other)
    draw_frequency VARCHAR(20) NOT NULL,                  -- Draw frequency (minutes, hourly, daily, custom)
    draw_interval INTEGER NOT NULL DEFAULT 5,             -- Draw interval (minutes)
    daily_start_issue INTEGER NOT NULL DEFAULT 1,         -- Daily start issue number
    issue_format VARCHAR(100) NOT NULL DEFAULT 'YYYYMMDD{###}', -- Issue format
    number_count INTEGER NOT NULL DEFAULT 5,              -- Number count
    number_range_min INTEGER NOT NULL DEFAULT 0,          -- Min number
    number_range_max INTEGER NOT NULL DEFAULT 9,          -- Max number
    start_time TIME,                                       -- Start time
    end_time TIME,                                         -- End time
    description TEXT,                                      -- Description
    status VARCHAR(20) NOT NULL DEFAULT 'active',         -- Status (active, disabled)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 奖期表 (lottery_issues)
CREATE TABLE IF NOT EXISTS lottery_issues (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_no VARCHAR(50) NOT NULL,                        -- 期号
    issue_date DATE NOT NULL,                             -- 期号日期
    issue_index INTEGER NOT NULL,                         -- 当日期号索引
    start_time TIMESTAMP NOT NULL,                        -- 开始时间
    end_time TIMESTAMP NOT NULL,                          -- 截止时间
    draw_time TIMESTAMP NOT NULL,                         -- 开奖时间
    status VARCHAR(20) NOT NULL DEFAULT 'pending',        -- 状态 (pending, closed, drawn, canceled)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_type_id, issue_no)
);

-- 3. 开奖结果表 (lottery_draws)
CREATE TABLE IF NOT EXISTS lottery_draws (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_id INTEGER NOT NULL REFERENCES lottery_issues(id) ON DELETE CASCADE,
    issue_no VARCHAR(50) NOT NULL,                        -- 期号
    draw_numbers VARCHAR(100) NOT NULL,                   -- 开奖号码 (逗号分隔)
    wan_wei INTEGER,                                       -- 万位
    qian_wei INTEGER,                                      -- 千位
    bai_wei INTEGER,                                       -- 百位
    shi_wei INTEGER,                                       -- 十位
    ge_wei INTEGER,                                        -- 个位
    sum_value INTEGER,                                     -- 和值
    sum_big_small VARCHAR(10),                            -- 和值大小 (big, small)
    sum_odd_even VARCHAR(10),                             -- 和值单双 (odd, even)
    draw_method VARCHAR(20) NOT NULL DEFAULT 'auto',      -- 开奖方式 (auto, manual, api)
    draw_status VARCHAR(20) NOT NULL DEFAULT 'pending',   -- 开奖状态 (pending, drawn, error, redraw)
    source VARCHAR(100),                                  -- 数据来源
    draw_time TIMESTAMP NOT NULL,                         -- 开奖时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_type_id, issue_no)
);

-- 4. 开奖历史归档表 (lottery_draws_archive)
CREATE TABLE IF NOT EXISTS lottery_draws_archive (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,                         -- 原记录ID
    lottery_type_id INTEGER NOT NULL,
    issue_id INTEGER,
    issue_no VARCHAR(50) NOT NULL,
    draw_numbers VARCHAR(100) NOT NULL,
    wan_wei INTEGER,
    qian_wei INTEGER,
    bai_wei INTEGER,
    shi_wei INTEGER,
    ge_wei INTEGER,
    sum_value INTEGER,
    sum_big_small VARCHAR(10),
    sum_odd_even VARCHAR(10),
    draw_method VARCHAR(20),
    draw_status VARCHAR(20),
    source VARCHAR(100),
    draw_time TIMESTAMP,
    original_created_at TIMESTAMP,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    archive_reason VARCHAR(100) DEFAULT 'daily_cleanup'
);

-- 5. 定时任务表 (lottery_scheduler)
CREATE TABLE IF NOT EXISTS lottery_scheduler (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,                    -- 任务名称
    type VARCHAR(50) NOT NULL,                            -- 任务类型 (fetch_draw, generate_issue, update_status, cleanup_data)
    lottery_type_id INTEGER REFERENCES lottery_types(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,                -- Cron表达式
    description TEXT,                                      -- 任务描述
    config JSONB,                                          -- 任务配置
    status VARCHAR(20) NOT NULL DEFAULT 'stopped',        -- 状态 (running, stopped, error)
    next_run_time TIMESTAMP,                              -- 下次执行时间
    last_run_time TIMESTAMP,                              -- 上次执行时间
    run_count INTEGER DEFAULT 0,                          -- 执行次数
    success_count INTEGER DEFAULT 0,                      -- 成功次数
    error_count INTEGER DEFAULT 0,                        -- 失败次数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 开奖日志表 (lottery_logs)
CREATE TABLE IF NOT EXISTS lottery_logs (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_id INTEGER REFERENCES lottery_issues(id) ON DELETE CASCADE,
    issue_no VARCHAR(50),                                  -- 期号
    operation VARCHAR(50) NOT NULL,                       -- 操作类型 (draw, redraw, revoke, fetch, manual)
    operator_id INTEGER REFERENCES admins(id),            -- 操作人ID
    operator_name VARCHAR(100),                           -- 操作人姓名
    before_data JSONB,                                     -- 操作前数据
    after_data JSONB,                                      -- 操作后数据
    result VARCHAR(20) NOT NULL,                          -- 执行结果 (success, failed, error)
    error_message TEXT,                                    -- 错误信息
    execution_time INTEGER,                               -- 执行耗时(毫秒)
    source VARCHAR(100),                                  -- 数据来源
    details TEXT,                                          -- 详细信息
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. 任务执行日志表 (lottery_scheduler_logs)
CREATE TABLE IF NOT EXISTS lottery_scheduler_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES lottery_scheduler(id) ON DELETE CASCADE,
    task_name VARCHAR(100) NOT NULL,                      -- 任务名称
    task_type VARCHAR(50) NOT NULL,                       -- 任务类型
    start_time TIMESTAMP NOT NULL,                        -- 开始时间
    end_time TIMESTAMP,                                    -- 结束时间
    duration INTEGER,                                      -- 执行时长(毫秒)
    result VARCHAR(20) NOT NULL,                          -- 执行结果 (success, failed)
    error_message TEXT,                                    -- 错误信息
    affected_records INTEGER DEFAULT 0,                   -- 影响记录数
    execution_log TEXT,                                    -- 执行日志
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. 系统配置表 (lottery_config)
CREATE TABLE IF NOT EXISTS lottery_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,              -- 配置键
    config_value TEXT NOT NULL,                           -- 配置值
    config_type VARCHAR(20) NOT NULL DEFAULT 'string',    -- 配置类型 (string, number, boolean, json)
    description TEXT,                                      -- 配置描述
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_lottery_types_code ON lottery_types(code);
CREATE INDEX IF NOT EXISTS idx_lottery_types_status ON lottery_types(status);

CREATE INDEX IF NOT EXISTS idx_lottery_issues_lottery_type ON lottery_issues(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_issues_issue_no ON lottery_issues(issue_no);
CREATE INDEX IF NOT EXISTS idx_lottery_issues_status ON lottery_issues(status);
CREATE INDEX IF NOT EXISTS idx_lottery_issues_draw_time ON lottery_issues(draw_time);

CREATE INDEX IF NOT EXISTS idx_lottery_draws_lottery_type ON lottery_draws(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_issue_no ON lottery_draws(issue_no);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_draw_status ON lottery_draws(draw_status);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_draw_time ON lottery_draws(draw_time);

CREATE INDEX IF NOT EXISTS idx_lottery_draws_archive_issue_no ON lottery_draws_archive(issue_no);
CREATE INDEX IF NOT EXISTS idx_lottery_draws_archive_archived_at ON lottery_draws_archive(archived_at);

CREATE INDEX IF NOT EXISTS idx_lottery_scheduler_status ON lottery_scheduler(status);
CREATE INDEX IF NOT EXISTS idx_lottery_scheduler_next_run ON lottery_scheduler(next_run_time);

CREATE INDEX IF NOT EXISTS idx_lottery_logs_lottery_type ON lottery_logs(lottery_type_id);
CREATE INDEX IF NOT EXISTS idx_lottery_logs_operation ON lottery_logs(operation);
CREATE INDEX IF NOT EXISTS idx_lottery_logs_created_at ON lottery_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_lottery_scheduler_logs_task_id ON lottery_scheduler_logs(task_id);
CREATE INDEX IF NOT EXISTS idx_lottery_scheduler_logs_start_time ON lottery_scheduler_logs(start_time);

-- 插入默认配置
INSERT INTO lottery_config (config_key, config_value, config_type, description) VALUES
('history_retention_count', '50', 'number', '历史开奖记录保留期数'),
('auto_cleanup_enabled', 'true', 'boolean', '是否启用自动清理'),
('cleanup_backup_enabled', 'true', 'boolean', '清理前是否备份数据'),
('cleanup_time_hour', '0', 'number', '清理执行时间（小时）'),
('cleanup_time_minute', '5', 'number', '清理执行时间（分钟）'),
('random_seed_sources', '["crypto", "os", "hardware"]', 'json', '随机数种子源'),
('draw_validation_enabled', 'true', 'boolean', '是否启用开奖验证'),
('max_draw_attempts', '100', 'number', '最大开奖尝试次数')
ON CONFLICT (config_key) DO NOTHING;
