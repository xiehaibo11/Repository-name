#!/usr/bin/env node

/**
 * 生产环境安全检查脚本
 * 检查是否有危险功能被启用
 */

const fs = require('fs');
const path = require('path');

console.log('🔒 生产环境安全检查\n');

let hasSecurityIssues = false;

// 检查环境变量
function checkEnvironmentVariables() {
  console.log('📋 检查环境变量...');
  
  const dangerousVars = [
    'ENABLE_DEV_PORT_KILLER',
    'AUTO_KILL_PORT_PROCESS'
  ];
  
  dangerousVars.forEach(varName => {
    const value = process.env[varName];
    if (value === 'true') {
      console.error(`❌ 危险: ${varName} = ${value}`);
      hasSecurityIssues = true;
    } else {
      console.log(`✅ 安全: ${varName} = ${value || 'undefined'}`);
    }
  });
  
  // 检查NODE_ENV
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv !== 'production') {
    console.warn(`⚠️  警告: NODE_ENV = ${nodeEnv} (建议设置为 'production')`);
  } else {
    console.log(`✅ 环境: NODE_ENV = ${nodeEnv}`);
  }
}

// 检查配置文件
function checkConfigFiles() {
  console.log('\n📋 检查配置文件...');
  
  const envFiles = ['.env', '.env.production'];
  
  envFiles.forEach(filename => {
    const filePath = path.join(__dirname, '..', filename);
    
    if (fs.existsSync(filePath)) {
      console.log(`📄 检查 ${filename}...`);
      
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n');
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        // 检查危险配置
        if (trimmedLine.includes('ENABLE_DEV_PORT_KILLER=true')) {
          console.error(`❌ ${filename}:${index + 1} - 发现危险配置: ${trimmedLine}`);
          hasSecurityIssues = true;
        }
        
        if (trimmedLine.includes('AUTO_KILL_PORT_PROCESS=true')) {
          console.error(`❌ ${filename}:${index + 1} - 发现危险配置: ${trimmedLine}`);
          hasSecurityIssues = true;
        }
        
        // 检查常见弱密码（排除用户自定义密码）
        if (trimmedLine.includes('DEFAULT_ADMIN_PASSWORD=') &&
            (trimmedLine.includes('admin123') ||
             trimmedLine.includes('password') ||
             trimmedLine.includes('123456') ||
             trimmedLine.includes('change-this-password'))) {
          console.warn(`⚠️  ${filename}:${index + 1} - 使用默认密码: ${trimmedLine}`);
        }
        
        // 检查默认JWT密钥
        if (trimmedLine.includes('JWT_SECRET=') && 
            trimmedLine.includes('change-this')) {
          console.warn(`⚠️  ${filename}:${index + 1} - 使用默认JWT密钥`);
        }
      });
    } else {
      console.log(`📄 ${filename} - 文件不存在`);
    }
  });
}

// 检查代码中的危险功能
function checkSourceCode() {
  console.log('\n📋 检查源代码...');
  
  const portManagerPath = path.join(__dirname, '..', 'src', 'utils', 'portManager.ts');
  
  if (fs.existsSync(portManagerPath)) {
    console.log('📄 检查 portManager.ts...');
    
    const content = fs.readFileSync(portManagerPath, 'utf8');
    
    if (content.includes('taskkill') || content.includes('killProcess')) {
      console.warn('⚠️  发现端口管理器包含进程终止功能');
      console.log('   请确保生产环境中此功能被正确禁用');
    }
    
    console.log('✅ 端口管理器检查完成');
  }
}

// 生成安全报告
function generateSecurityReport() {
  console.log('\n📊 安全检查报告');
  console.log('='.repeat(50));
  
  if (hasSecurityIssues) {
    console.error('❌ 发现安全问题！');
    console.error('   请修复上述问题后再部署到生产环境');
    console.error('   建议操作:');
    console.error('   1. 设置 ENABLE_DEV_PORT_KILLER=false');
    console.error('   2. 设置 AUTO_KILL_PORT_PROCESS=false');
    console.error('   3. 设置 NODE_ENV=production');
    console.error('   4. 修改默认密码和密钥');
    return false;
  } else {
    console.log('✅ 安全检查通过！');
    console.log('   可以安全部署到生产环境');
    return true;
  }
}

// 主函数
function main() {
  checkEnvironmentVariables();
  checkConfigFiles();
  checkSourceCode();
  
  const isSecure = generateSecurityReport();
  
  process.exit(isSecure ? 0 : 1);
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  checkEnvironmentVariables,
  checkConfigFiles,
  checkSourceCode,
  generateSecurityReport
};
