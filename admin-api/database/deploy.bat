@echo off
REM 后端管理系统数据库部署脚本 (Windows版本)
REM 使用方法: deploy.bat [环境] [数据库名]
REM 示例: deploy.bat production backend_management_system

setlocal enabledelayedexpansion

REM 设置默认参数
set ENVIRONMENT=%1
if "%ENVIRONMENT%"=="" set ENVIRONMENT=development

set DATABASE_NAME=%2
if "%DATABASE_NAME%"=="" set DATABASE_NAME=backend_management_system

echo [%date% %time%] 开始部署数据库...
echo [%date% %time%] 环境: %ENVIRONMENT%
echo [%date% %time%] 数据库名: %DATABASE_NAME%

REM 检查PostgreSQL是否安装
psql --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] PostgreSQL 未安装，请先安装 PostgreSQL
    pause
    exit /b 1
)

REM 读取数据库配置
if exist "../.env" (
    echo [%date% %time%] 已找到环境配置文件
    REM 在Windows中读取.env文件比较复杂，这里使用默认值
) else (
    echo [WARNING] 未找到 .env 文件，使用默认配置
)

REM 设置默认数据库配置
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres
set DB_NAME=%DATABASE_NAME%

REM 检查数据库连接
echo [%date% %time%] 检查数据库连接...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "SELECT 1;" >nul 2>&1
if errorlevel 1 (
    echo [ERROR] 无法连接到数据库服务器
    echo [ERROR] 请检查数据库配置: %DB_HOST%:%DB_PORT%
    echo [ERROR] 请确保PostgreSQL服务正在运行
    pause
    exit /b 1
)

echo [%date% %time%] 数据库连接成功

REM 创建数据库（如果不存在）
echo [%date% %time%] 创建数据库 %DB_NAME%（如果不存在）...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d postgres -c "CREATE DATABASE \"%DB_NAME%\";" 2>nul

REM 执行初始化脚本
echo [%date% %time%] 执行数据库初始化脚本...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f init.sql
if errorlevel 1 (
    echo [ERROR] 数据库初始化失败
    pause
    exit /b 1
)

echo [%date% %time%] 数据库初始化完成

REM 执行迁移文件（按顺序）
echo [%date% %time%] 执行数据库迁移...
for %%f in (migrations\*.sql) do (
    echo [%date% %time%] 执行迁移: %%~nxf
    psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -f "%%f"
    if errorlevel 1 (
        echo [ERROR] 迁移 %%~nxf 失败
        pause
        exit /b 1
    )
    echo [%date% %time%] 迁移 %%~nxf 完成
)

REM 验证表是否创建成功
echo [%date% %time%] 验证数据库表...
psql -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DB_NAME% -c "SELECT tablename FROM pg_tables WHERE schemaname = 'public';"

echo [%date% %time%] 🎉 数据库部署完成！
echo [%date% %time%] 数据库: %DB_NAME%
echo [%date% %time%] 主机: %DB_HOST%:%DB_PORT%
echo [%date% %time%] 用户: %DB_USER%

pause
