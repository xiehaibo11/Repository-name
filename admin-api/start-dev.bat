@echo off
chcp 65001 >nul
title 后端管理系统 - 开发环境

echo.
echo 🚀 启动后端管理系统（开发环境）
echo ================================
echo.

:: 检查是否在正确的目录
if not exist "package.json" (
    echo ❌ 错误: 请在项目根目录运行此脚本
    pause
    exit /b 1
)

:: 检查 Node.js
node --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Node.js，请先安装 Node.js
    pause
    exit /b 1
)

:: 检查 Redis
redis-server --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 错误: 未找到 Redis，请先安装 Redis
    echo 💡 提示: 运行 .\scripts\setup-redis.ps1 自动安装
    pause
    exit /b 1
)

echo 🔍 检查 Redis 状态...
redis-cli -a 123456 ping >nul 2>&1
if errorlevel 1 (
    echo ⚠️  Redis 未运行，正在启动...
    echo 📦 启动 Redis 服务器...
    start "Redis Server" /min redis-server redis-dev.conf
    
    :: 等待 Redis 启动
    timeout /t 3 /nobreak >nul
    
    :: 再次检查 Redis
    redis-cli -a 123456 ping >nul 2>&1
    if errorlevel 1 (
        echo ❌ Redis 启动失败，但继续启动后端服务...
    ) else (
        echo ✅ Redis 启动成功
    )
) else (
    echo ✅ Redis 已在运行
)

echo.
echo 🔧 启动后端开发服务器...
echo 📍 服务地址: http://localhost:3001
echo 📋 API文档: http://localhost:3001/api
echo 🔧 健康检查: http://localhost:3001/health
echo.
echo 💡 提示: 按 Ctrl+C 停止服务
echo ================================
echo.

:: 启动后端服务
npm run dev

echo.
echo 🛑 服务已停止
pause
