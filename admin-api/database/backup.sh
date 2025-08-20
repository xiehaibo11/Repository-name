#!/bin/bash

# 后端管理系统数据库备份脚本
# 使用方法: ./backup.sh [数据库名] [备份目录]

set -e

# 颜色定义
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_message() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')] $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING: $1${NC}"
}

print_error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $1${NC}"
}

# 参数设置
DATABASE_NAME=${1:-backend_management_system}
BACKUP_DIR=${2:-./backups}
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="$BACKUP_DIR/${DATABASE_NAME}_backup_$TIMESTAMP.sql"

# 创建备份目录
mkdir -p "$BACKUP_DIR"

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
fi

# 设置PGPASSWORD环境变量
if [ ! -z "$DB_PASSWORD" ]; then
    export PGPASSWORD="$DB_PASSWORD"
fi

print_message "开始备份数据库: $DATABASE_NAME"
print_message "备份文件: $BACKUP_FILE"

# 执行备份
if pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DATABASE_NAME" \
    --verbose \
    --clean \
    --if-exists \
    --create \
    --format=plain \
    --encoding=UTF8 \
    > "$BACKUP_FILE"; then
    
    print_message "数据库备份完成"
    
    # 压缩备份文件
    if gzip "$BACKUP_FILE"; then
        print_message "备份文件已压缩: ${BACKUP_FILE}.gz"
        BACKUP_FILE="${BACKUP_FILE}.gz"
    fi
    
    # 显示备份文件信息
    BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
    print_message "备份文件大小: $BACKUP_SIZE"
    
    # 清理旧备份（保留最近7天）
    find "$BACKUP_DIR" -name "${DATABASE_NAME}_backup_*.sql.gz" -mtime +7 -delete 2>/dev/null || true
    print_message "已清理7天前的旧备份文件"
    
else
    print_error "数据库备份失败"
    exit 1
fi

# 清理环境变量
unset PGPASSWORD

print_message "🎉 备份操作完成！"
