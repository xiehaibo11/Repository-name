-- 分分时时彩系统数据库表结构
-- 基于设计文档的完整实现

-- 1. 开奖结果表
CREATE TABLE ssc_draw_results (
    id BIGSERIAL PRIMARY KEY,
    issue_no VARCHAR(12) UNIQUE NOT NULL,
    draw_time TIMESTAMP NOT NULL,
    
    -- 开奖号码 (万千百十个)
    wan_number SMALLINT NOT NULL CHECK (wan_number >= 0 AND wan_number <= 9),
    qian_number SMALLINT NOT NULL CHECK (qian_number >= 0 AND qian_number <= 9),
    bai_number SMALLINT NOT NULL CHECK (bai_number >= 0 AND bai_number <= 9),
    shi_number SMALLINT NOT NULL CHECK (shi_number >= 0 AND shi_number <= 9),
    ge_number SMALLINT NOT NULL CHECK (ge_number >= 0 AND ge_number <= 9),
    
    -- 和值相关
    sum_value SMALLINT NOT NULL,
    sum_big_small VARCHAR(5) NOT NULL CHECK (sum_big_small IN ('big', 'small')),
    sum_odd_even VARCHAR(4) NOT NULL CHECK (sum_odd_even IN ('odd', 'even')),
    
    -- 各位属性 (JSON格式存储)
    positions_attributes JSONB NOT NULL,
    
    -- 龙虎 (第1位 vs 第5位)
    dragon_tiger VARCHAR(6) NOT NULL CHECK (dragon_tiger IN ('dragon', 'tiger', 'tie')),
    
    -- 奇偶统计
    odd_count SMALLINT NOT NULL,
    even_count SMALLINT NOT NULL,
    
    -- 跨度
    front3_span SMALLINT NOT NULL,
    middle3_span SMALLINT NOT NULL,
    back3_span SMALLINT NOT NULL,
    
    -- 牛牛结果 (JSON格式)
    bull_result JSONB NOT NULL,
    
    -- 牛梭哈结果 (JSON格式)
    poker_result JSONB NOT NULL,
    
    -- 状态和时间
    status VARCHAR(10) DEFAULT 'completed',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. 投注订单表
CREATE TABLE ssc_bet_orders (
    id BIGSERIAL PRIMARY KEY,
    order_no VARCHAR(32) UNIQUE NOT NULL,
    user_id BIGINT NOT NULL,
    issue_no VARCHAR(12) NOT NULL,
    
    -- 投注信息
    total_amount DECIMAL(10,2) NOT NULL,
    total_win_amount DECIMAL(10,2) DEFAULT 0,
    bet_count INTEGER NOT NULL,
    
    -- 状态
    status VARCHAR(10) NOT NULL DEFAULT 'pending' 
        CHECK (status IN ('pending', 'win', 'lose', 'cancelled')),
    
    -- 时间
    bet_time TIMESTAMP NOT NULL,
    settle_time TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3. 投注明细表
CREATE TABLE ssc_bet_items (
    id BIGSERIAL PRIMARY KEY,
    order_id BIGINT NOT NULL REFERENCES ssc_bet_orders(id),
    
    -- 投注内容
    game_type VARCHAR(50) NOT NULL,
    bet_content TEXT NOT NULL,
    bet_value JSONB NOT NULL,
    
    -- 金额和赔率
    amount DECIMAL(10,2) NOT NULL,
    odds DECIMAL(8,2) NOT NULL,
    win_amount DECIMAL(10,2) DEFAULT 0,
    
    -- 结果
    is_win BOOLEAN,
    result_description TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 4. 赔率配置表
CREATE TABLE ssc_odds_config (
    id SERIAL PRIMARY KEY,
    game_type VARCHAR(50) NOT NULL,
    bet_type VARCHAR(50) NOT NULL,
    odds DECIMAL(8,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(game_type, bet_type)
);

-- 5. 系统配置表
CREATE TABLE ssc_system_config (
    id SERIAL PRIMARY KEY,
    config_key VARCHAR(50) UNIQUE NOT NULL,
    config_value TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 6. 创建索引
CREATE INDEX idx_ssc_draw_results_issue ON ssc_draw_results(issue_no);
CREATE INDEX idx_ssc_draw_results_time ON ssc_draw_results(draw_time);
CREATE INDEX idx_ssc_draw_results_status ON ssc_draw_results(status);

CREATE INDEX idx_ssc_bet_orders_user ON ssc_bet_orders(user_id);
CREATE INDEX idx_ssc_bet_orders_issue ON ssc_bet_orders(issue_no);
CREATE INDEX idx_ssc_bet_orders_status ON ssc_bet_orders(status);
CREATE INDEX idx_ssc_bet_orders_bet_time ON ssc_bet_orders(bet_time);

CREATE INDEX idx_ssc_bet_items_order ON ssc_bet_items(order_id);
CREATE INDEX idx_ssc_bet_items_game_type ON ssc_bet_items(game_type);

-- 7. 插入默认赔率配置
INSERT INTO ssc_odds_config (game_type, bet_type, odds) VALUES
-- 数字盘赔率
('number', 'wan', 9.8),
('number', 'qian', 9.8),
('number', 'bai', 9.8),
('number', 'shi', 9.8),
('number', 'ge', 9.8),

-- 双面玩法赔率
('double_face', 'big_small', 1.98),
('double_face', 'odd_even', 1.98),
('double_face', 'prime_composite', 1.98),
('double_face', 'sum_big_small', 1.98),
('double_face', 'sum_odd_even', 1.98),

-- 牛牛赔率
('bull', 'none', 2.66),
('bull', 'bull1', 14.88),
('bull', 'bull2', 14.68),
('bull', 'bull3', 14.88),
('bull', 'bull4', 14.68),
('bull', 'bull5', 14.88),
('bull', 'bull6', 14.68),
('bull', 'bull7', 14.88),
('bull', 'bull8', 14.68),
('bull', 'bull9', 14.88),
('bull', 'bullbull', 14.68),

-- 牛双面赔率
('bull_double', 'big', 2.68),
('bull_double', 'small', 2.88),
('bull_double', 'odd', 2.98),
('bull_double', 'even', 2.58),
('bull_double', 'prime', 2.96),
('bull_double', 'composite', 2.66),

-- 牛梭哈赔率
('poker', 'five_of_kind', 9000),
('poker', 'four_of_kind', 200),
('poker', 'full_house', 100),
('poker', 'straight', 80),
('poker', 'three_of_kind', 12.88),
('poker', 'two_pair', 8.88),
('poker', 'one_pair', 1.88),
('poker', 'high_card', 2.98),

-- 定位玩法赔率
('position', 'one', 9.8),
('position', 'two', 83),
('position', 'three', 690),

-- 跨度赔率
('span', '0', 71),
('span', '1', 14.8),
('span', '2', 8.1),
('span', '3', 6.2),
('span', '4', 5.4),
('span', '5', 5.2),
('span', '6', 5.4),
('span', '7', 6.2),
('span', '8', 8.1),
('span', '9', 14.4),

-- 龙虎赔率
('dragon_tiger', 'dragon', 1.98),
('dragon_tiger', 'tiger', 1.98),
('dragon_tiger', 'tie', 9);

-- 8. 插入系统配置
INSERT INTO ssc_system_config (config_key, config_value, description) VALUES
('draw_interval', '60', '开奖间隔时间(秒)'),
('bet_amounts', '[10,50,100,500,1000,5000,10000,50000]', '可选投注金额'),
('bet_close_before_draw', '10', '开奖前多少秒停止投注'),
('daily_issues_count', '1440', '每日期数'),
('history_retention_days', '30', '历史记录保留天数'),
('max_bet_per_user_per_issue', '100000', '单用户单期最大投注金额'),
('system_maintenance_time', '04:00-04:30', '系统维护时间'),
('enable_auto_draw', 'true', '是否启用自动开奖');

SELECT 'SSC数据库表创建完成' as status;
