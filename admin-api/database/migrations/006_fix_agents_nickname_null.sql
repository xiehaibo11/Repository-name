-- 修复 agents 表中 nickname 字段的 NULL 值问题
-- 这个脚本将更新所有 nickname 为 NULL 的记录，设置为默认值

-- 首先检查是否有 nickname 为 NULL 的记录
DO $$
DECLARE
    null_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO null_count 
    FROM agents 
    WHERE nickname IS NULL;
    
    RAISE NOTICE '发现 % 条 nickname 为 NULL 的记录', null_count;
    
    -- 如果有 NULL 记录，则更新它们
    IF null_count > 0 THEN
        -- 更新 nickname 为 NULL 的记录，使用 username 作为默认 nickname
        UPDATE agents 
        SET nickname = COALESCE(username, 'Agent_' || id::text)
        WHERE nickname IS NULL;
        
        RAISE NOTICE '已更新 % 条记录的 nickname 字段', null_count;
    ELSE
        RAISE NOTICE '没有发现 nickname 为 NULL 的记录';
    END IF;
END $$;

-- 验证更新结果
SELECT 
    COUNT(*) as total_agents,
    COUNT(nickname) as agents_with_nickname,
    COUNT(*) - COUNT(nickname) as agents_with_null_nickname
FROM agents;

-- 显示更新后的数据示例
SELECT id, username, nickname, status, created_at
FROM agents 
ORDER BY id 
LIMIT 10;
