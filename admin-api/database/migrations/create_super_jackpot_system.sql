-- =====================================================
-- 避开中奖控制系统数据库表创建脚本
-- 实现约5960万分之一的会员中奖概率系统
-- 系统主动避开会员投注号码，确保极低中奖率
-- =====================================================

-- 1. 避开中奖系统配置表
-- 管理系统的概率控制参数
CREATE TABLE IF NOT EXISTS avoid_win_config (
    id SERIAL PRIMARY KEY,
    config_name VARCHAR(100) NOT NULL UNIQUE,                  -- 配置名称
    allow_win_probability DECIMAL(20,10) NOT NULL DEFAULT 0.0000000168, -- 允许中奖概率 (1/59,600,000)
    system_enabled BOOLEAN NOT NULL DEFAULT true,              -- 系统是否启用
    min_bet_amount DECIMAL(10,2) NOT NULL DEFAULT 1.00,        -- 最小投注金额要求
    max_analysis_combinations INTEGER NOT NULL DEFAULT 100000, -- 最大分析组合数
    analysis_timeout_seconds INTEGER NOT NULL DEFAULT 30,      -- 分析超时时间
    description TEXT,                                           -- 配置描述
    updated_by INTEGER,                                         -- 更新操作员ID
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 插入默认配置
INSERT INTO avoid_win_config (
    config_name, allow_win_probability, description
) VALUES (
    'default',
    0.0000000168,
    '默认避开中奖配置 - 约5960万分之一允许会员中奖概率'
) ON CONFLICT (config_name) DO NOTHING;

-- 2. 避开中奖决策日志表
-- 记录每期的开奖决策过程和结果
CREATE TABLE IF NOT EXISTS avoid_win_logs (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,                                  -- 期号ID
    issue_no VARCHAR(50) NOT NULL,                             -- 期号
    decision_type VARCHAR(50) NOT NULL,                        -- 决策类型: member_win_avoided, member_win_allowed, analysis_failed
    draw_numbers VARCHAR(20) NOT NULL,                         -- 最终开奖号码
    random_value DECIMAL(20,10) NOT NULL,                      -- 生成的随机值
    probability_used DECIMAL(20,10) NOT NULL,                  -- 使用的概率
    total_bets INTEGER NOT NULL DEFAULT 0,                     -- 当期总投注数
    analyzed_bets INTEGER NOT NULL DEFAULT 0,                  -- 分析的投注数
    winning_combinations_count INTEGER NOT NULL DEFAULT 0,     -- 会员中奖组合数量
    analysis_time_ms INTEGER NOT NULL DEFAULT 0,               -- 分析耗时(毫秒)
    avoided_combinations TEXT,                                  -- 避开的中奖组合(JSON格式)
    decision_details JSONB,                                     -- 决策详情(JSON格式)
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    FOREIGN KEY (issue_id) REFERENCES lottery_issues(id)
);

-- 3. 会员投注分析表
-- 记录每期会员投注的详细分析结果
CREATE TABLE IF NOT EXISTS member_bet_analysis (
    id SERIAL PRIMARY KEY,
    issue_id INTEGER NOT NULL,                                  -- 期号ID
    issue_no VARCHAR(50) NOT NULL,                             -- 期号
    total_bets INTEGER NOT NULL DEFAULT 0,                     -- 总投注数
    valid_bets INTEGER NOT NULL DEFAULT 0,                     -- 有效投注数
    total_bet_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,      -- 总投注金额
    winning_combinations JSONB,                                 -- 所有中奖组合(JSON格式)
    bet_type_distribution JSONB,                                -- 投注类型分布(JSON格式)
    position_distribution JSONB,                                -- 位置投注分布(JSON格式)
    number_distribution JSONB,                                  -- 数字投注分布(JSON格式)
    analysis_result VARCHAR(50) NOT NULL,                      -- 分析结果: success, failed, timeout
    analysis_time_ms INTEGER NOT NULL DEFAULT 0,               -- 分析耗时
    coverage_percentage DECIMAL(8,4) NOT NULL DEFAULT 0.0000,  -- 中奖组合覆盖率
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    FOREIGN KEY (issue_id) REFERENCES lottery_issues(id)
);

-- 4. 会员中奖记录表（极少数情况）
-- 记录系统允许会员中奖的极少数情况
CREATE TABLE IF NOT EXISTS member_win_records (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,                                   -- 中奖用户ID
    issue_id INTEGER NOT NULL,                                  -- 中奖期号ID
    issue_no VARCHAR(50) NOT NULL,                             -- 中奖期号
    bet_id INTEGER NOT NULL,                                    -- 中奖投注ID
    bet_type VARCHAR(50) NOT NULL,                             -- 投注类型
    bet_content JSONB NOT NULL,                                 -- 投注内容
    bet_amount DECIMAL(10,2) NOT NULL,                         -- 投注金额
    win_amount DECIMAL(15,2) NOT NULL,                         -- 中奖金额
    draw_numbers VARCHAR(20) NOT NULL,                         -- 开奖号码
    probability_used DECIMAL(20,10) NOT NULL,                  -- 使用的概率
    random_value DECIMAL(20,10) NOT NULL,                      -- 随机值
    win_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,     -- 中奖时间
    status VARCHAR(20) NOT NULL DEFAULT 'pending',             -- 状态: pending, paid, cancelled
    paid_time TIMESTAMP,                                        -- 支付时间
    paid_by INTEGER,                                           -- 支付操作员ID
    notes TEXT,                                                -- 备注
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

    -- 外键约束
    FOREIGN KEY (issue_id) REFERENCES lottery_issues(id),
    FOREIGN KEY (user_id) REFERENCES members(id)
);

-- 5. 系统统计表
-- 记录避开中奖系统的运行统计数据
CREATE TABLE IF NOT EXISTS avoid_win_statistics (
    id SERIAL PRIMARY KEY,
    stat_date DATE NOT NULL UNIQUE,                            -- 统计日期
    total_issues INTEGER NOT NULL DEFAULT 0,                   -- 总期数
    total_bets INTEGER NOT NULL DEFAULT 0,                     -- 总投注数
    total_bet_amount DECIMAL(15,2) NOT NULL DEFAULT 0.00,      -- 总投注金额
    avoided_issues INTEGER NOT NULL DEFAULT 0,                 -- 避开中奖期数
    allowed_issues INTEGER NOT NULL DEFAULT 0,                 -- 允许中奖期数
    member_wins INTEGER NOT NULL DEFAULT 0,                    -- 会员中奖次数
    total_member_winnings DECIMAL(15,2) NOT NULL DEFAULT 0.00, -- 会员总中奖金额
    system_profit DECIMAL(15,2) NOT NULL DEFAULT 0.00,         -- 系统盈利
    avoid_success_rate DECIMAL(8,4) NOT NULL DEFAULT 100.0000, -- 避开成功率
    average_analysis_time_ms INTEGER NOT NULL DEFAULT 0,       -- 平均分析时间
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- =====================================================
-- 索引创建
-- =====================================================

-- 避开中奖日志表索引
CREATE INDEX IF NOT EXISTS idx_avoid_win_logs_issue_id ON avoid_win_logs(issue_id);
CREATE INDEX IF NOT EXISTS idx_avoid_win_logs_decision_type ON avoid_win_logs(decision_type);
CREATE INDEX IF NOT EXISTS idx_avoid_win_logs_created_at ON avoid_win_logs(created_at);

-- 会员投注分析表索引
CREATE INDEX IF NOT EXISTS idx_member_bet_analysis_issue_id ON member_bet_analysis(issue_id);
CREATE INDEX IF NOT EXISTS idx_member_bet_analysis_created_at ON member_bet_analysis(created_at);

-- 会员中奖记录表索引
CREATE INDEX IF NOT EXISTS idx_member_win_records_user_id ON member_win_records(user_id);
CREATE INDEX IF NOT EXISTS idx_member_win_records_issue_id ON member_win_records(issue_id);
CREATE INDEX IF NOT EXISTS idx_member_win_records_status ON member_win_records(status);
CREATE INDEX IF NOT EXISTS idx_member_win_records_win_time ON member_win_records(win_time);

-- 统计表索引
CREATE INDEX IF NOT EXISTS idx_avoid_win_statistics_stat_date ON avoid_win_statistics(stat_date);

-- =====================================================
-- 触发器和函数
-- =====================================================

-- 更新统计数据的触发器函数
CREATE OR REPLACE FUNCTION update_avoid_win_statistics()
RETURNS TRIGGER AS $$
BEGIN
    -- 当有新的避开中奖日志时，更新统计数据
    INSERT INTO avoid_win_statistics (
        stat_date, total_issues, total_bets, total_bet_amount,
        avoided_issues, allowed_issues, member_wins, total_member_winnings,
        average_analysis_time_ms
    ) VALUES (
        CURRENT_DATE, 1, NEW.total_bets, 0,
        CASE WHEN NEW.decision_type = 'member_win_avoided' THEN 1 ELSE 0 END,
        CASE WHEN NEW.decision_type = 'member_win_allowed' THEN 1 ELSE 0 END,
        0, 0, NEW.analysis_time_ms
    )
    ON CONFLICT (stat_date) DO UPDATE SET
        total_issues = avoid_win_statistics.total_issues + 1,
        total_bets = avoid_win_statistics.total_bets + NEW.total_bets,
        avoided_issues = avoid_win_statistics.avoided_issues +
            CASE WHEN NEW.decision_type = 'member_win_avoided' THEN 1 ELSE 0 END,
        allowed_issues = avoid_win_statistics.allowed_issues +
            CASE WHEN NEW.decision_type = 'member_win_allowed' THEN 1 ELSE 0 END,
        average_analysis_time_ms = (avoid_win_statistics.average_analysis_time_ms * avoid_win_statistics.total_issues + NEW.analysis_time_ms) / (avoid_win_statistics.total_issues + 1),
        updated_at = CURRENT_TIMESTAMP;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建统计触发器
DROP TRIGGER IF EXISTS trigger_update_avoid_win_statistics ON avoid_win_logs;
CREATE TRIGGER trigger_update_avoid_win_statistics
    AFTER INSERT ON avoid_win_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_avoid_win_statistics();

-- =====================================================
-- 权限设置
-- =====================================================

-- 确保相关用户有适当的权限
-- GRANT SELECT, INSERT, UPDATE ON avoid_win_config TO lottery_system;
-- GRANT SELECT, INSERT ON avoid_win_logs TO lottery_system;
-- GRANT SELECT, INSERT ON member_bet_analysis TO lottery_system;
-- GRANT SELECT, INSERT, UPDATE ON member_win_records TO lottery_system;
-- GRANT SELECT, INSERT, UPDATE ON avoid_win_statistics TO lottery_system;

-- =====================================================
-- 完成提示
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ 避开中奖控制系统数据库表创建完成!';
    RAISE NOTICE '📊 允许中奖概率: 1/59,600,000 (约5960万分之一)';
    RAISE NOTICE '🎯 系统功能: 主动避开会员投注号码';
    RAISE NOTICE '🔧 系统状态: 已激活';
    RAISE NOTICE '📋 管理接口: /api/admin/avoid-win/*';
END $$;
