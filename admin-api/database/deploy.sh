#!/bin/bash

# 后端管理系统数据库部署脚本
# 使用方法: ./deploy.sh [环境] [数据库名]
# 示例: ./deploy.sh production backend_management_system

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 打印带颜色的消息
print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# 检查参数
ENVIRONMENT=${1:-development}
DATABASE_NAME=${2:-backend_management_system}

print_message "开始部署数据库..."
print_message "环境: $ENVIRONMENT"
print_message "数据库名: $DATABASE_NAME"

# 检查PostgreSQL是否安装
if ! command -v psql &> /dev/null; then
    print_error "PostgreSQL 未安装，请先安装 PostgreSQL"
    exit 1
fi

# 读取数据库配置
if [ -f "../.env" ]; then
    source ../.env
    print_message "已加载环境配置文件"
else
    print_warning "未找到 .env 文件，使用默认配置"
    DB_HOST=${DB_HOST:-localhost}
    DB_PORT=${DB_PORT:-5432}
    DB_USER=${DB_USER:-postgres}
    DB_PASSWORD=${DB_PASSWORD:-}
    DB_NAME=${DATABASE_NAME}
fi

# 设置PGPASSWORD环境变量（如果有密码）
if [ ! -z "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

# 检查数据库连接
print_message "检查数据库连接..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1;" &> /dev/null; then
    print_error "无法连接到数据库服务器"
    print_error "请检查数据库配置: $DB_HOST:$DB_PORT"
    exit 1
fi

print_message "数据库连接成功"

# 创建数据库（如果不存在）
print_message "创建数据库 $DB_NAME（如果不存在）..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE \"$DB_NAME\";" 2>/dev/null || true

# 执行初始化脚本
print_message "执行数据库初始化脚本..."
if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f init.sql; then
    print_message "数据库初始化完成"
else
    print_error "数据库初始化失败"
    exit 1
fi

# 执行迁移文件（按顺序）
print_message "执行数据库迁移..."
for migration_file in migrations/*.sql; do
    if [ -f "$migration_file" ]; then
        print_message "执行迁移: $(basename "$migration_file")"
        if psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file"; then
            print_message "迁移 $(basename "$migration_file") 完成"
        else
            print_error "迁移 $(basename "$migration_file") 失败"
            exit 1
        fi
    fi
done

# 验证表是否创建成功
print_message "验证数据库表..."
TABLES=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | tr -d ' ')

expected_tables=("admins" "agents" "members" "credit_logs" "balance_logs")
for table in "${expected_tables[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
        print_message "✓ 表 $table 创建成功"
    else
        print_error "✗ 表 $table 未找到"
        exit 1
    fi
done

# 显示表统计信息
print_message "数据库表统计信息:"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
SELECT 
    schemaname,
    tablename,
    attname as column_name,
    typname as data_type
FROM pg_tables t
JOIN pg_attribute a ON a.attrelid = (schemaname||'.'||tablename)::regclass
JOIN pg_type ty ON ty.oid = a.atttypid
WHERE schemaname = 'public' 
AND attnum > 0 
AND NOT attisdropped
ORDER BY tablename, attnum;
"

print_message "🎉 数据库部署完成！"
print_message "数据库: $DB_NAME"
print_message "主机: $DB_HOST:$DB_PORT"
print_message "用户: $DB_USER"

# 清理环境变量
unset PGPASSWORD
