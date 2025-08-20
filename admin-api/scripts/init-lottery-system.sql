-- 彩票管理系统初始化脚本
-- 执行此脚本来初始化彩票管理系统

-- 1. 执行主要的数据库结构创建
\i migrations/create_lottery_system.sql

-- 2. 插入分分时时彩彩种
INSERT INTO lottery_types (
    name, code, category, draw_frequency, draw_interval, daily_start_issue,
    issue_format, number_count, number_range_min, number_range_max,
    start_time, end_time, description, status
) VALUES (
    '分分时时彩', 'ssc', 'ssc', 'minutes', 1, 1,
    'YYYYMMDD{####}', 5, 0, 9,
    '00:00:00', '23:59:59', '分分时时彩，每分钟开奖一次，全天24小时不间断', 'active'
) ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- 3. 插入其他常见彩种
INSERT INTO lottery_types (
    name, code, category, draw_frequency, draw_interval, daily_start_issue,
    issue_format, number_count, number_range_min, number_range_max,
    start_time, end_time, description, status
) VALUES 
(
    '五分时时彩', 'ssc5', 'ssc', 'minutes', 5, 1,
    'YYYYMMDD{###}', 5, 0, 9,
    '00:00:00', '23:59:59', '五分时时彩，每5分钟开奖一次', 'active'
),
(
    '十分时时彩', 'ssc10', 'ssc', 'minutes', 10, 1,
    'YYYYMMDD{###}', 5, 0, 9,
    '00:00:00', '23:59:59', '十分时时彩，每10分钟开奖一次', 'active'
),
(
    '快3', 'k3', 'k3', 'minutes', 10, 1,
    'YYYYMMDD{###}', 3, 1, 6,
    '09:00:00', '22:00:00', '快3，每10分钟开奖一次', 'active'
),
(
    'PK10', 'pk10', 'pk10', 'minutes', 5, 1,
    'YYYYMMDD{###}', 10, 1, 10,
    '09:00:00', '23:00:00', 'PK10，每5分钟开奖一次', 'active'
),
(
    '11选5', '11x5', '11x5', 'minutes', 10, 1,
    'YYYYMMDD{##}', 5, 1, 11,
    '08:30:00', '22:00:00', '11选5，每10分钟开奖一次', 'active'
)
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- 4. 插入定时任务配置
INSERT INTO lottery_scheduler (
    name, type, lottery_type_id, cron_expression, description, config, status
) VALUES 
(
    '分分时时彩自动开奖', 'auto_draw', 
    (SELECT id FROM lottery_types WHERE code = 'ssc'), 
    '* * * * *', '每分钟检查并执行分分时时彩开奖', 
    '{"auto_generate_numbers": true, "validation_enabled": true}', 'stopped'
),
(
    '每日生成期号', 'generate_issue', NULL, 
    '5 0 * * *', '每日凌晨00:05生成当日所有期号', 
    '{"generate_all_types": true}', 'stopped'
),
(
    '历史数据清理', 'cleanup_data', NULL, 
    '10 0 * * *', '每日凌晨00:10清理历史开奖数据', 
    '{"retention_days": 30, "backup_enabled": true}', 'stopped'
),
(
    '系统健康检查', 'health_check', NULL, 
    '0 * * * *', '每小时执行系统健康检查', 
    '{"check_database": true, "check_scheduler": true}', 'stopped'
)
ON CONFLICT (name) DO UPDATE SET
    description = EXCLUDED.description,
    config = EXCLUDED.config,
    updated_at = CURRENT_TIMESTAMP;

-- 5. 创建历史数据清理函数
CREATE OR REPLACE FUNCTION cleanup_lottery_history_records(
    retention_count INTEGER DEFAULT 50,
    enable_backup BOOLEAN DEFAULT true
)
RETURNS JSON AS $$
DECLARE
    cleanup_result RECORD;
    backup_count INTEGER := 0;
    delete_count INTEGER := 0;
    latest_issue VARCHAR(50);
    oldest_issue VARCHAR(50);
    min_keep_id INTEGER;
    lottery_type_record RECORD;
BEGIN
    -- 为每个彩种分别清理
    FOR lottery_type_record IN 
        SELECT id, name, code FROM lottery_types WHERE status = 'active'
    LOOP
        -- 获取需要保留的最新记录的最小ID
        SELECT MIN(id), MAX(issue_no), MIN(issue_no)
        INTO min_keep_id, latest_issue, oldest_issue
        FROM (
            SELECT id, issue_no
            FROM lottery_draws
            WHERE lottery_type_id = lottery_type_record.id 
              AND draw_status = 'drawn'
            ORDER BY draw_time DESC
            LIMIT retention_count
        ) recent_records;
        
        -- 如果启用备份，先备份要删除的记录
        IF enable_backup AND min_keep_id IS NOT NULL THEN
            INSERT INTO lottery_draws_archive (
                original_id, lottery_type_id, issue_id, issue_no, draw_numbers,
                wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
                sum_value, sum_big_small, sum_odd_even,
                draw_method, draw_status, source, draw_time, original_created_at
            )
            SELECT 
                id, lottery_type_id, issue_id, issue_no, draw_numbers,
                wan_wei, qian_wei, bai_wei, shi_wei, ge_wei,
                sum_value, sum_big_small, sum_odd_even,
                draw_method, draw_status, source, draw_time, created_at
            FROM lottery_draws
            WHERE lottery_type_id = lottery_type_record.id
              AND draw_status = 'drawn' 
              AND id < min_keep_id;
            
            GET DIAGNOSTICS backup_count = ROW_COUNT;
        END IF;
        
        -- 删除过期记录
        IF min_keep_id IS NOT NULL THEN
            DELETE FROM lottery_draws
            WHERE lottery_type_id = lottery_type_record.id
              AND draw_status = 'drawn' 
              AND id < min_keep_id;
            
            GET DIAGNOSTICS delete_count = ROW_COUNT;
            
            -- 同步清理期号表
            DELETE FROM lottery_issues
            WHERE lottery_type_id = lottery_type_record.id
              AND id NOT IN (
                  SELECT DISTINCT issue_id FROM lottery_draws 
                  WHERE issue_id IS NOT NULL 
                    AND lottery_type_id = lottery_type_record.id
              );
        END IF;
    END LOOP;
    
    -- 返回清理结果
    RETURN json_build_object(
        'cleaned_count', delete_count,
        'backed_up_count', backup_count,
        'latest_kept_issue', latest_issue,
        'oldest_kept_issue', oldest_issue,
        'retention_count', retention_count,
        'cleanup_time', CURRENT_TIMESTAMP
    );
END;
$$ LANGUAGE plpgsql;

-- 6. 创建获取彩票统计的函数
CREATE OR REPLACE FUNCTION get_lottery_statistics(
    lottery_type_code VARCHAR(50) DEFAULT NULL,
    date_from DATE DEFAULT CURRENT_DATE,
    date_to DATE DEFAULT CURRENT_DATE
)
RETURNS JSON AS $$
DECLARE
    result JSON;
    lottery_filter TEXT := '';
BEGIN
    -- 构建彩种过滤条件
    IF lottery_type_code IS NOT NULL THEN
        lottery_filter := ' AND lt.code = ''' || lottery_type_code || '''';
    END IF;
    
    -- 执行统计查询
    EXECUTE format('
        SELECT json_build_object(
            ''total_issues'', COUNT(DISTINCT i.id),
            ''total_draws'', COUNT(DISTINCT d.id),
            ''pending_issues'', COUNT(DISTINCT CASE WHEN i.status = ''pending'' THEN i.id END),
            ''drawn_issues'', COUNT(DISTINCT CASE WHEN i.status = ''drawn'' THEN i.id END),
            ''completion_rate'', CASE 
                WHEN COUNT(DISTINCT i.id) > 0 
                THEN ROUND((COUNT(DISTINCT CASE WHEN i.status = ''drawn'' THEN i.id END)::DECIMAL / COUNT(DISTINCT i.id)) * 100, 2)
                ELSE 0 
            END,
            ''lottery_types'', json_agg(DISTINCT json_build_object(
                ''id'', lt.id,
                ''name'', lt.name,
                ''code'', lt.code,
                ''category'', lt.category
            )),
            ''date_range'', json_build_object(
                ''from'', ''%s'',
                ''to'', ''%s''
            ),
            ''generated_at'', CURRENT_TIMESTAMP
        )
        FROM lottery_issues i
        LEFT JOIN lottery_draws d ON i.id = d.issue_id
        JOIN lottery_types lt ON i.lottery_type_id = lt.id
        WHERE i.issue_date BETWEEN ''%s'' AND ''%s''
        %s
    ', date_from, date_to, date_from, date_to, lottery_filter)
    INTO result;
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 7. 创建数据完整性检查函数
CREATE OR REPLACE FUNCTION check_lottery_data_integrity()
RETURNS JSON AS $$
DECLARE
    orphaned_draws INTEGER;
    orphaned_issues INTEGER;
    missing_draws INTEGER;
    duplicate_issues INTEGER;
    result JSON;
BEGIN
    -- 检查孤立的开奖记录（没有对应期号）
    SELECT COUNT(*) INTO orphaned_draws
    FROM lottery_draws d
    WHERE d.issue_id NOT IN (SELECT id FROM lottery_issues);
    
    -- 检查孤立的期号（没有对应彩种）
    SELECT COUNT(*) INTO orphaned_issues
    FROM lottery_issues i
    WHERE i.lottery_type_id NOT IN (SELECT id FROM lottery_types);
    
    -- 检查缺失的开奖记录（已过开奖时间但未开奖）
    SELECT COUNT(*) INTO missing_draws
    FROM lottery_issues i
    WHERE i.status = 'pending' 
      AND i.draw_time < CURRENT_TIMESTAMP
      AND i.id NOT IN (SELECT DISTINCT issue_id FROM lottery_draws WHERE issue_id IS NOT NULL);
    
    -- 检查重复的期号
    SELECT COUNT(*) INTO duplicate_issues
    FROM (
        SELECT lottery_type_id, issue_no, COUNT(*) as cnt
        FROM lottery_issues
        GROUP BY lottery_type_id, issue_no
        HAVING COUNT(*) > 1
    ) duplicates;
    
    -- 构建结果
    result := json_build_object(
        'orphaned_draws', orphaned_draws,
        'orphaned_issues', orphaned_issues,
        'missing_draws', missing_draws,
        'duplicate_issues', duplicate_issues,
        'is_healthy', (orphaned_draws = 0 AND orphaned_issues = 0 AND duplicate_issues = 0),
        'check_time', CURRENT_TIMESTAMP,
        'recommendations', CASE 
            WHEN orphaned_draws > 0 OR orphaned_issues > 0 OR duplicate_issues > 0 
            THEN json_build_array(
                CASE WHEN orphaned_draws > 0 THEN '清理孤立的开奖记录' END,
                CASE WHEN orphaned_issues > 0 THEN '清理孤立的期号记录' END,
                CASE WHEN duplicate_issues > 0 THEN '处理重复的期号' END,
                CASE WHEN missing_draws > 0 THEN '补充缺失的开奖记录' END
            )
            ELSE json_build_array('数据完整性良好')
        END
    );
    
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 8. 插入示例配置数据
INSERT INTO lottery_config (config_key, config_value, config_type, description) VALUES
('system_timezone', 'Asia/Shanghai', 'string', '系统时区'),
('draw_timeout_seconds', '30', 'number', '开奖超时时间（秒）'),
('max_retry_attempts', '3', 'number', '最大重试次数'),
('enable_draw_notification', 'true', 'boolean', '是否启用开奖通知'),
('notification_webhook_url', '', 'string', '开奖通知Webhook地址'),
('enable_api_logging', 'true', 'boolean', '是否启用API日志'),
('log_retention_days', '30', 'number', '日志保留天数'),
('enable_performance_monitoring', 'true', 'boolean', '是否启用性能监控')
ON CONFLICT (config_key) DO UPDATE SET
    config_value = EXCLUDED.config_value,
    description = EXCLUDED.description,
    updated_at = CURRENT_TIMESTAMP;

-- 9. 创建视图以便查询
CREATE OR REPLACE VIEW v_lottery_summary AS
SELECT 
    lt.id as lottery_type_id,
    lt.name as lottery_name,
    lt.code as lottery_code,
    lt.category,
    lt.draw_interval,
    COUNT(DISTINCT i.id) as total_issues,
    COUNT(DISTINCT CASE WHEN i.status = 'pending' THEN i.id END) as pending_issues,
    COUNT(DISTINCT CASE WHEN i.status = 'drawn' THEN i.id END) as drawn_issues,
    COUNT(DISTINCT d.id) as total_draws,
    MAX(d.draw_time) as last_draw_time,
    MIN(CASE WHEN i.status = 'pending' THEN i.draw_time END) as next_draw_time
FROM lottery_types lt
LEFT JOIN lottery_issues i ON lt.id = i.lottery_type_id
LEFT JOIN lottery_draws d ON i.id = d.issue_id AND d.draw_status = 'drawn'
WHERE lt.status = 'active'
GROUP BY lt.id, lt.name, lt.code, lt.category, lt.draw_interval
ORDER BY lt.created_at;

-- 完成初始化
SELECT 'Lottery system initialization completed successfully!' as message;
