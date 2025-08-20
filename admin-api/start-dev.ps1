# 后端管理系统启动脚本 (PowerShell)
# 自动启动 Redis 和后端服务

param(
    [switch]$SkipRedis,
    [switch]$Verbose
)

# 设置控制台编码
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 启动后端管理系统（开发环境）" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# 检查是否在正确的目录
if (-not (Test-Path "package.json")) {
    Write-Host "❌ 错误: 请在项目根目录运行此脚本" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 检查 Node.js
try {
    $nodeVersion = node --version
    if ($Verbose) {
        Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
    }
} catch {
    Write-Host "❌ 错误: 未找到 Node.js，请先安装 Node.js" -ForegroundColor Red
    Read-Host "按任意键退出"
    exit 1
}

# 检查 Redis（如果不跳过）
if (-not $SkipRedis) {
    try {
        $redisVersion = redis-server --version
        if ($Verbose) {
            Write-Host "✅ Redis 版本: $redisVersion" -ForegroundColor Green
        }
    } catch {
        Write-Host "❌ 错误: 未找到 Redis，请先安装 Redis" -ForegroundColor Red
        Write-Host "💡 提示: 运行 .\scripts\setup-redis.ps1 自动安装" -ForegroundColor Yellow
        Read-Host "按任意键退出"
        exit 1
    }

    # 检查 Redis 状态
    Write-Host "🔍 检查 Redis 状态..." -ForegroundColor Blue
    try {
        $pingResult = redis-cli -a 123456 ping 2>$null
        if ($pingResult -eq "PONG") {
            Write-Host "✅ Redis 已在运行" -ForegroundColor Green
        } else {
            throw "Redis not responding"
        }
    } catch {
        Write-Host "⚠️  Redis 未运行，正在启动..." -ForegroundColor Yellow
        Write-Host "📦 启动 Redis 服务器..." -ForegroundColor Blue
        
        # 启动 Redis（在新窗口中）
        $redisProcess = Start-Process -FilePath "redis-server" -ArgumentList "redis-dev.conf" -WindowStyle Minimized -PassThru
        
        # 等待 Redis 启动
        Start-Sleep -Seconds 3
        
        # 再次检查 Redis
        try {
            $pingResult = redis-cli -a 123456 ping 2>$null
            if ($pingResult -eq "PONG") {
                Write-Host "✅ Redis 启动成功" -ForegroundColor Green
            } else {
                Write-Host "❌ Redis 启动失败，但继续启动后端服务..." -ForegroundColor Yellow
            }
        } catch {
            Write-Host "❌ Redis 启动失败，但继续启动后端服务..." -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "⏭️  跳过 Redis 检查" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "🔧 启动后端开发服务器..." -ForegroundColor Blue
Write-Host "📍 服务地址: http://localhost:3001" -ForegroundColor Cyan
Write-Host "📋 API文档: http://localhost:3001/api" -ForegroundColor Cyan
Write-Host "🔧 健康检查: http://localhost:3001/health" -ForegroundColor Cyan
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 停止服务" -ForegroundColor Magenta
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# 设置优雅关闭处理
function Cleanup {
    Write-Host ""
    Write-Host "🛑 正在关闭服务..." -ForegroundColor Yellow

    if (-not $SkipRedis) {
        try {
            Write-Host "📦 关闭 Redis 连接..." -ForegroundColor Blue
            # 不关闭 Redis 服务器，只是断开连接
        } catch {
            # 忽略错误
        }
    }

    Write-Host "✅ 服务已停止" -ForegroundColor Green
    exit 0
}

# 注册 Ctrl+C 处理
$null = Register-EngineEvent PowerShell.Exiting -Action { Cleanup }

try {
    # 启动后端服务
    npm run dev
} catch {
    Write-Host "❌ 后端服务启动失败: $_" -ForegroundColor Red
} finally {
    Cleanup
}
