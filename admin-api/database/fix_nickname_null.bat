@echo off
chcp 65001 >nul
echo ========================================
echo 修复 agents 表 nickname 字段 NULL 值问题
echo ========================================
echo.

REM 设置数据库配置
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=backend_management

REM 检查 PostgreSQL 是否可用
echo [%date% %time%] 检查 PostgreSQL 连接...
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL 未安装或不在 PATH 中
    echo [ERROR] 请确保 PostgreSQL 已安装并添加到系统 PATH
    pause
    exit /b 1
)

REM 测试数据库连接
echo [%date% %time%] 测试数据库连接...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 无法连接到数据库
    echo [ERROR] 请检查数据库配置:
    echo [ERROR]   主机: %DB_HOST%
    echo [ERROR]   端口: %DB_PORT%
    echo [ERROR]   用户: %DB_USER%
    echo [ERROR]   数据库: %DB_NAME%
    echo [ERROR] 请确保 PostgreSQL 服务正在运行
    pause
    exit /b 1
)

echo [%date% %time%] 数据库连接成功

REM 执行修复脚本
echo [%date% %time%] 执行 nickname 字段修复脚本...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "migrations\006_fix_agents_nickname_null.sql"
if errorlevel 1 (
    echo [ERROR] 修复脚本执行失败
    pause
    exit /b 1
)

echo.
echo [%date% %time%] ✅ nickname 字段修复完成！
echo [%date% %time%] 现在可以重新启动应用程序
echo.
pause
