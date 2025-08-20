-- Lottery Management System Database Structure
-- Created: 2025-01-21

-- 1. Lottery Types Table
CREATE TABLE IF NOT EXISTS lottery_types (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    code VARCHAR(50) NOT NULL UNIQUE,
    category VARCHAR(50) NOT NULL,
    draw_frequency VARCHAR(20) NOT NULL,
    draw_interval INTEGER NOT NULL DEFAULT 5,
    daily_start_issue INTEGER NOT NULL DEFAULT 1,
    issue_format VARCHAR(100) NOT NULL DEFAULT 'YYYYMMDD{###}',
    number_count INTEGER NOT NULL DEFAULT 5,
    number_range_min INTEGER NOT NULL DEFAULT 0,
    number_range_max INTEGER NOT NULL DEFAULT 9,
    start_time TIME,
    end_time TIME,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Lottery Issues Table
CREATE TABLE IF NOT EXISTS lottery_issues (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_no VARCHAR(50) NOT NULL,
    issue_date DATE NOT NULL,
    issue_index INTEGER NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP NOT NULL,
    draw_time TIMESTAMP NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_type_id, issue_no)
);

-- 3. Lottery Draws Table
CREATE TABLE IF NOT EXISTS lottery_draws (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER NOT NULL REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_id INTEGER NOT NULL REFERENCES lottery_issues(id) ON DELETE CASCADE,
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
    draw_method VARCHAR(20) NOT NULL DEFAULT 'auto',
    draw_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    source VARCHAR(100),
    draw_time TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(lottery_type_id, issue_no)
);

-- 4. Lottery Draws Archive Table
CREATE TABLE IF NOT EXISTS lottery_draws_archive (
    id SERIAL PRIMARY KEY,
    original_id INTEGER NOT NULL,
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

-- 5. Lottery Scheduler Table
CREATE TABLE IF NOT EXISTS lottery_scheduler (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    type VARCHAR(50) NOT NULL,
    lottery_type_id INTEGER REFERENCES lottery_types(id) ON DELETE CASCADE,
    cron_expression VARCHAR(100) NOT NULL,
    description TEXT,
    config JSONB,
    status VARCHAR(20) NOT NULL DEFAULT 'stopped',
    next_run_time TIMESTAMP,
    last_run_time TIMESTAMP,
    run_count INTEGER DEFAULT 0,
    success_count INTEGER DEFAULT 0,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. Lottery Logs Table
CREATE TABLE IF NOT EXISTS lottery_logs (
    id SERIAL PRIMARY KEY,
    lottery_type_id INTEGER REFERENCES lottery_types(id) ON DELETE CASCADE,
    issue_id INTEGER REFERENCES lottery_issues(id) ON DELETE CASCADE,
    issue_no VARCHAR(50),
    operation VARCHAR(50) NOT NULL,
    operator_id INTEGER,
    operator_name VARCHAR(100),
    before_data JSONB,
    after_data JSONB,
    result VARCHAR(20) NOT NULL,
    error_message TEXT,
    execution_time INTEGER,
    source VARCHAR(100),
    details TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 7. Scheduler Logs Table
CREATE TABLE IF NOT EXISTS lottery_scheduler_logs (
    id SERIAL PRIMARY KEY,
    task_id INTEGER REFERENCES lottery_scheduler(id) ON DELETE CASCADE,
    task_name VARCHAR(100) NOT NULL,
    task_type VARCHAR(50) NOT NULL,
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER,
    result VARCHAR(20) NOT NULL,
    error_message TEXT,
    affected_records INTEGER DEFAULT 0,
    execution_log TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 8. System Config Table
CREATE TABLE IF NOT EXISTS lottery_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    config_type VARCHAR(20) NOT NULL DEFAULT 'string',
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Indexes
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

-- Insert Default Config
INSERT INTO lottery_config (config_key, config_value, config_type, description) VALUES
('history_retention_count', '50', 'number', 'History retention count'),
('auto_cleanup_enabled', 'true', 'boolean', 'Auto cleanup enabled'),
('cleanup_backup_enabled', 'true', 'boolean', 'Backup before cleanup'),
('cleanup_time_hour', '0', 'number', 'Cleanup hour'),
('cleanup_time_minute', '5', 'number', 'Cleanup minute'),
('random_seed_sources', '["crypto", "os", "hardware"]', 'json', 'Random seed sources'),
('draw_validation_enabled', 'true', 'boolean', 'Draw validation enabled'),
('max_draw_attempts', '100', 'number', 'Max draw attempts')
ON CONFLICT (config_key) DO NOTHING;
