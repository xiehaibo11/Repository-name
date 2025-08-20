-- 创建超级大奖相关表

-- 1. 超级大奖奖池表
CREATE TABLE IF NOT EXISTS super_jackpot_pool (
    id SERIAL PRIMARY KEY,
    amount DECIMAL(15,2) NOT NULL DEFAULT 1000000.00, -- 奖池金额
    status VARCHAR(20) NOT NULL DEFAULT 'active', -- active, claimed
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    claimed_at TIMESTAMP NULL,
    
    CONSTRAINT chk_amount_positive CHECK (amount >= 0),
    CONSTRAINT chk_status_valid CHECK (status IN ('active', 'claimed'))
);

-- 2. 超级大奖中奖记录表
CREATE TABLE IF NOT EXISTS super_jackpot_winners (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    issue_no VARCHAR(50) NOT NULL,
    amount DECIMAL(15,2) NOT NULL,
    win_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) NOT NULL DEFAULT 'pending', -- pending, paid, cancelled
    algorithm VARCHAR(50) NOT NULL DEFAULT 'weighted_random_selection',
    
    -- 中奖详情
    base_bet_type VARCHAR(50), -- 基础投注类型
    base_bet_amount DECIMAL(10,2), -- 基础投注金额
    base_win_amount DECIMAL(10,2), -- 基础中奖金额
    
    -- 概率控制信息
    probability_used DECIMAL(20,15), -- 使用的概率
    random_value DECIMAL(20,15), -- 随机数值
    adjustment_factors JSONB, -- 调整因子详情
    
    -- 支付信息
    paid_at TIMESTAMP NULL,
    paid_by INTEGER NULL, -- 操作员ID
    payment_method VARCHAR(50) NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_amount_positive CHECK (amount > 0),
    CONSTRAINT chk_status_valid CHECK (status IN ('pending', 'paid', 'cancelled'))
);

-- 3. 超级大奖贡献记录表
CREATE TABLE IF NOT EXISTS super_jackpot_contributions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    bet_id INTEGER, -- 关联的投注ID
    issue_no VARCHAR(50) NOT NULL,
    contribution_amount DECIMAL(10,2) NOT NULL, -- 贡献金额
    contribution_rate DECIMAL(5,4) NOT NULL DEFAULT 0.1000, -- 贡献比例（10%）
    base_bet_amount DECIMAL(10,2) NOT NULL, -- 基础投注金额
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_contribution_positive CHECK (contribution_amount > 0),
    CONSTRAINT chk_rate_valid CHECK (contribution_rate >= 0 AND contribution_rate <= 1)
);

-- 4. 超级大奖配置表
CREATE TABLE IF NOT EXISTS super_jackpot_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(100) NOT NULL UNIQUE,
    config_value TEXT NOT NULL,
    description TEXT,
    data_type VARCHAR(20) NOT NULL DEFAULT 'string', -- string, number, boolean, json
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 5. 超级大奖统计表
CREATE TABLE IF NOT EXISTS super_jackpot_stats (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL,
    
    -- 奖池统计
    pool_amount_start DECIMAL(15,2), -- 当日开始奖池金额
    pool_amount_end DECIMAL(15,2), -- 当日结束奖池金额
    total_contributions DECIMAL(15,2) DEFAULT 0, -- 当日总贡献
    
    -- 中奖统计
    winners_count INTEGER DEFAULT 0, -- 中奖人数
    total_paid DECIMAL(15,2) DEFAULT 0, -- 总支付金额
    
    -- 概率统计
    total_base_wins INTEGER DEFAULT 0, -- 基础中奖次数
    super_jackpot_triggers INTEGER DEFAULT 0, -- 超级大奖触发次数
    actual_probability DECIMAL(20,15), -- 实际概率
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT uk_stat_date UNIQUE (stat_date)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_super_jackpot_pool_status ON super_jackpot_pool(status);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_winners_user_id ON super_jackpot_winners(user_id);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_winners_issue_no ON super_jackpot_winners(issue_no);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_winners_status ON super_jackpot_winners(status);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_winners_win_time ON super_jackpot_winners(win_time);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_contributions_user_id ON super_jackpot_contributions(user_id);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_contributions_issue_no ON super_jackpot_contributions(issue_no);
CREATE INDEX IF NOT EXISTS idx_super_jackpot_stats_date ON super_jackpot_stats(stat_date);

-- 插入初始配置
INSERT INTO super_jackpot_config (config_key, config_value, description, data_type) VALUES
('target_probability', '0.000000016779', '目标中奖概率 (1/59,600,000)', 'number'),
('base_jackpot_amount', '1000000', '基础奖池金额', 'number'),
('contribution_rate', '0.1', '每注投注的贡献比例', 'number'),
('max_jackpot_amount', '100000000', '最大奖池金额', 'number'),
('special_time_start', '20', '特殊时间开始（小时）', 'number'),
('special_time_end', '22', '特殊时间结束（小时）', 'number'),
('new_user_days', '7', '新用户定义天数', 'number'),
('high_bet_threshold', '10000', '高额投注阈值', 'number'),
('jackpot_boost_threshold', '5000000', '奖池提升阈值', 'number'),
('max_probability', '0.001', '最大中奖概率', 'number')
ON CONFLICT (config_key) DO NOTHING;

-- 插入初始奖池
INSERT INTO super_jackpot_pool (amount, status) VALUES (1000000.00, 'active')
ON CONFLICT DO NOTHING;

-- 创建触发器：自动更新 updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 应用触发器
DROP TRIGGER IF EXISTS update_super_jackpot_pool_updated_at ON super_jackpot_pool;
CREATE TRIGGER update_super_jackpot_pool_updated_at
    BEFORE UPDATE ON super_jackpot_pool
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_super_jackpot_winners_updated_at ON super_jackpot_winners;
CREATE TRIGGER update_super_jackpot_winners_updated_at
    BEFORE UPDATE ON super_jackpot_winners
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_super_jackpot_config_updated_at ON super_jackpot_config;
CREATE TRIGGER update_super_jackpot_config_updated_at
    BEFORE UPDATE ON super_jackpot_config
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 创建视图：超级大奖概览
CREATE OR REPLACE VIEW super_jackpot_overview AS
SELECT 
    -- 当前奖池
    (SELECT amount FROM super_jackpot_pool WHERE status = 'active' LIMIT 1) as current_jackpot,
    
    -- 历史统计
    (SELECT COUNT(*) FROM super_jackpot_winners WHERE status = 'paid') as total_winners,
    (SELECT COALESCE(SUM(amount), 0) FROM super_jackpot_winners WHERE status = 'paid') as total_paid,
    
    -- 今日统计
    (SELECT COUNT(*) FROM super_jackpot_winners WHERE DATE(win_time) = CURRENT_DATE) as today_winners,
    (SELECT COALESCE(SUM(contribution_amount), 0) FROM super_jackpot_contributions WHERE DATE(created_at) = CURRENT_DATE) as today_contributions,
    
    -- 配置信息
    (SELECT config_value::DECIMAL FROM super_jackpot_config WHERE config_key = 'target_probability') as target_probability,
    (SELECT config_value::DECIMAL FROM super_jackpot_config WHERE config_key = 'contribution_rate') as contribution_rate;

-- 添加注释
COMMENT ON TABLE super_jackpot_pool IS '超级大奖奖池表';
COMMENT ON TABLE super_jackpot_winners IS '超级大奖中奖记录表';
COMMENT ON TABLE super_jackpot_contributions IS '超级大奖贡献记录表';
COMMENT ON TABLE super_jackpot_config IS '超级大奖配置表';
COMMENT ON TABLE super_jackpot_stats IS '超级大奖统计表';
COMMENT ON VIEW super_jackpot_overview IS '超级大奖概览视图';

-- 创建完成提示
SELECT 
    '超级大奖数据库表创建完成！' as message,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE 'super_jackpot%') as tables_created,
    (SELECT amount FROM super_jackpot_pool WHERE status = 'active' LIMIT 1) as initial_jackpot;
