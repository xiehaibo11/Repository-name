-- 初始化分分时时彩彩种脚本
-- 确保分分时时彩彩种存在并配置正确

-- 插入或更新分分时时彩彩种
INSERT INTO lottery_types (
    name, code, category, draw_frequency, draw_interval, daily_start_issue, daily_issue_count,
    issue_format, number_count, number_range_min, number_range_max,
    start_time, end_time, draw_time_control, seal_time, sound_alert, countdown_display,
    random_source, randomness_validation, blockchain_record, target_win_rate,
    dynamic_payout_adjustment, anomaly_detection, multi_signature, audit_log,
    manual_draw_mode, smart_avoidance, risk_control_level, new_member_induction,
    induction_win_amount, induction_periods, big_bet_monitoring, big_bet_threshold,
    consecutive_loss_control, member_profit_limit, profit_recovery_mode, platform_protection_rate,
    description, status
) VALUES (
    '分分时时彩', 'ssc', 'ssc', 'minutes', 1, 1, 1440,
    'YYYYMMDD{####}', 5, 0, 9,
    '00:00:00', '23:59:59', '00:01:00', 10, true, true,
    'hybrid', true, true, 0.000000017,
    true, true, true, true,
    false, true, 'high', true,
    100, 3, true, 5000,
    20, 50000, 'smart', 85.0,
    '分分时时彩，每分钟开奖一次，全天24小时不间断。期号格式：YYYYMMDD0001-YYYYMMDD1440，每日1440期。开奖前10秒封盘，支持提示音和倒计时显示。', 'active'
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    issue_format = EXCLUDED.issue_format,
    daily_issue_count = EXCLUDED.daily_issue_count,
    draw_frequency = EXCLUDED.draw_frequency,
    draw_interval = EXCLUDED.draw_interval,
    updated_at = CURRENT_TIMESTAMP;

-- 验证插入结果
SELECT id, name, code, issue_format, daily_issue_count, status 
FROM lottery_types 
WHERE code = 'ssc';
