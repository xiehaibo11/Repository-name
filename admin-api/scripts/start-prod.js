#!/usr/bin/env node

/**
 * 生产环境启动脚本
 * 🔒 安全：禁用所有危险功能
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

console.log('🔒 生产环境启动脚本');
console.log('✅ 所有危险功能已禁用');
console.log('✅ 使用安全的生产环境配置\n');

// 检查生产环境配置文件
const prodEnvPath = path.join(__dirname, '..', '.env.production');
if (!fs.existsSync(prodEnvPath)) {
  console.error('❌ 未找到生产环境配置文件: .env.production');
  console.error('   请创建生产环境配置文件');
  process.exit(1);
}

// 强制设置生产环境
process.env.NODE_ENV = 'production';

// 强制禁用危险功能
process.env.ENABLE_DEV_PORT_KILLER = 'false';
process.env.AUTO_KILL_PORT_PROCESS = 'false';

console.log('📋 环境检查:');
console.log(`   NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`   端口清理器: ${process.env.ENABLE_DEV_PORT_KILLER === 'true' ? '❌ 启用' : '✅ 禁用'}`);
console.log(`   自动杀进程: ${process.env.AUTO_KILL_PORT_PROCESS === 'true' ? '❌ 启用' : '✅ 禁用'}\n`);

// 启动生产服务器
const serverProcess = spawn('npm', ['start'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_ENV: 'production'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`\n📋 生产服务器已停止 (退出码: ${code})`);
  process.exit(code);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n🔄 正在停止生产服务器...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 正在停止生产服务器...');
  serverProcess.kill('SIGTERM');
});
