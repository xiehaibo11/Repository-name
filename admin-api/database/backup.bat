@echo off
REM 后端管理系统数据库备份脚本 (Windows版本)
REM 使用方法: backup.bat [数据库名] [备份目录]

setlocal enabledelayedexpansion

REM 设置参数
set DATABASE_NAME=%1
if "%DATABASE_NAME%"=="" set DATABASE_NAME=backend_management_system

set BACKUP_DIR=%2
if "%BACKUP_DIR%"=="" set BACKUP_DIR=.\backups

REM 生成时间戳
for /f "tokens=2 delims==" %%a in ('wmic OS Get localdatetime /value') do set "dt=%%a"
set "YY=%dt:~2,2%" & set "YYYY=%dt:~0,4%" & set "MM=%dt:~4,2%" & set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%" & set "Min=%dt:~10,2%" & set "Sec=%dt:~12,2%"
set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

set BACKUP_FILE=%BACKUP_DIR%\%DATABASE_NAME%_backup_%TIMESTAMP%.sql

REM 创建备份目录
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

REM 设置默认数据库配置
set DB_HOST=localhost
set DB_PORT=5432
set DB_USER=postgres

echo [%date% %time%] 开始备份数据库: %DATABASE_NAME%
echo [%date% %time%] 备份文件: %BACKUP_FILE%

REM 执行备份
pg_dump -h %DB_HOST% -p %DB_PORT% -U %DB_USER% -d %DATABASE_NAME% --verbose --clean --if-exists --create --format=plain --encoding=UTF8 > "%BACKUP_FILE%"

if errorlevel 1 (
    echo [ERROR] 数据库备份失败
    pause
    exit /b 1
)

echo [%date% %time%] 数据库备份完成

REM 显示备份文件信息
for %%A in ("%BACKUP_FILE%") do set BACKUP_SIZE=%%~zA
set /a BACKUP_SIZE_MB=%BACKUP_SIZE%/1024/1024
echo [%date% %time%] 备份文件大小: %BACKUP_SIZE_MB% MB

REM 清理旧备份（保留最近7天）
forfiles /p "%BACKUP_DIR%" /m "%DATABASE_NAME%_backup_*.sql" /d -7 /c "cmd /c del @path" 2>nul
echo [%date% %time%] 已清理7天前的旧备份文件

echo [%date% %time%] 🎉 备份操作完成！

pause
