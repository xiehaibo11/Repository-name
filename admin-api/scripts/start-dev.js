#!/usr/bin/env node

/**
 * 开发环境启动脚本
 * 🚨 警告：此脚本包含危险的端口清理功能
 * 🚨 仅限开发环境使用！
 */

const { spawn } = require('child_process');
const path = require('path');

console.log('🚨 开发环境启动脚本');
console.log('⚠️  警告：此脚本启用了端口自动清理功能');
console.log('⚠️  此功能会强制杀死占用端口的进程');
console.log('⚠️  仅限开发环境使用！\n');

// 确保使用开发环境配置
process.env.NODE_ENV = 'development';

// 启动开发服务器
const serverProcess = spawn('npm', ['run', 'dev'], {
  cwd: path.join(__dirname, '..'),
  stdio: 'inherit',
  shell: true
});

serverProcess.on('error', (error) => {
  console.error('❌ 启动失败:', error);
  process.exit(1);
});

serverProcess.on('close', (code) => {
  console.log(`\n📋 开发服务器已停止 (退出码: ${code})`);
  process.exit(code);
});

// 处理退出信号
process.on('SIGINT', () => {
  console.log('\n🔄 正在停止开发服务器...');
  serverProcess.kill('SIGINT');
});

process.on('SIGTERM', () => {
  console.log('\n🔄 正在停止开发服务器...');
  serverProcess.kill('SIGTERM');
});
