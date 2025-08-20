-- 清理分分时时彩相关数据表
-- 执行前请确保已备份重要数据

-- 1. 删除旧的分分时时彩相关表
DROP TABLE IF EXISTS ssc_lottery_results_archive CASCADE;
DROP TABLE IF EXISTS ssc_cleanup_history CASCADE;
DROP TABLE IF EXISTS lottery_issues CASCADE;
DROP TABLE IF EXISTS lottery_draws CASCADE;

-- 2. 删除旧的彩种记录
DELETE FROM lottery_types WHERE code = 'ssc';

-- 3. 删除相关的系统配置
DELETE FROM system_config WHERE config_key LIKE 'ssc_%';

-- 4. 删除相关的清理函数
DROP FUNCTION IF EXISTS cleanup_old_lottery_results(integer, boolean);
DROP FUNCTION IF EXISTS get_lottery_results_stats();
DROP FUNCTION IF EXISTS get_lottery_results_summary(date);
DROP FUNCTION IF EXISTS check_lottery_data_integrity();

-- 5. 清理完成提示
SELECT 'SSC相关数据清理完成' as status;
