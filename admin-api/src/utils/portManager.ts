import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ⚠️ 危险操作：开发时端口管理工具
 * 
 * 🚨 警告：此功能仅限开发环境使用！
 * 🚨 生产环境必须禁用此功能！
 * 🚨 此功能会强制杀死占用端口的进程！
 */

interface PortInfo {
  port: number;
  pid: number;
  processName: string;
}

/**
 * 检查端口是否被占用
 */
export async function checkPortInUse(port: number): Promise<PortInfo | null> {
  try {
    const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
    
    if (!stdout.trim()) {
      return null; // 端口未被占用
    }

    // 解析netstat输出
    const lines = stdout.trim().split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parseInt(parts[parts.length - 1]);
        
        if (pid && !isNaN(pid)) {
          // 获取进程名称
          try {
            const { stdout: processInfo } = await execAsync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`);
            const processName = processInfo.split(',')[0].replace(/"/g, '');
            
            return {
              port,
              pid,
              processName
            };
          } catch {
            return {
              port,
              pid,
              processName: 'Unknown'
            };
          }
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error(`❌ 检查端口 ${port} 失败:`, error);
    return null;
  }
}

/**
 * 强制杀死进程
 * ⚠️ 危险操作！
 */
export async function killProcess(pid: number): Promise<boolean> {
  try {
    await execAsync(`taskkill /PID ${pid} /F`);
    console.log(`✅ 已强制终止进程 PID: ${pid}`);
    
    // 等待一下确保进程被杀死
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return true;
  } catch (error) {
    console.error(`❌ 终止进程 ${pid} 失败:`, error);
    return false;
  }
}

/**
 * 开发环境端口清理器
 * ⚠️ 仅限开发环境使用！
 */
export async function developmentPortCleaner(port: number): Promise<boolean> {
  // 🚨 安全检查：确保只在开发环境运行
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.ENABLE_DEV_PORT_KILLER === 'true';
  
  if (!isDevelopment) {
    console.log('🔒 端口清理器已禁用（非开发环境）');
    return false;
  }

  console.log(`🔍 检查端口 ${port} 占用情况...`);
  
  const portInfo = await checkPortInUse(port);
  
  if (!portInfo) {
    console.log(`✅ 端口 ${port} 未被占用`);
    return true;
  }

  console.log(`⚠️  端口 ${port} 被占用:`);
  console.log(`   进程ID: ${portInfo.pid}`);
  console.log(`   进程名: ${portInfo.processName}`);
  
  // 询问是否要杀死进程（在开发环境中自动确认）
  if (process.env.AUTO_KILL_PORT_PROCESS === 'true') {
    console.log(`🚨 自动杀死模式已启用，正在终止进程...`);
    
    const killed = await killProcess(portInfo.pid);
    
    if (killed) {
      // 再次检查端口是否已释放
      const stillInUse = await checkPortInUse(port);
      if (!stillInUse) {
        console.log(`✅ 端口 ${port} 已成功释放`);
        return true;
      } else {
        console.log(`❌ 端口 ${port} 仍被占用`);
        return false;
      }
    }
    
    return false;
  } else {
    console.log(`❌ 端口 ${port} 被占用，请手动处理或启用自动杀死模式`);
    console.log(`   提示: 设置环境变量 AUTO_KILL_PORT_PROCESS=true 启用自动杀死`);
    return false;
  }
}

/**
 * 安全的端口检查器（生产环境友好）
 */
export async function safePortCheck(port: number): Promise<boolean> {
  const portInfo = await checkPortInUse(port);
  
  if (portInfo) {
    console.error(`❌ 端口 ${port} 已被占用 (PID: ${portInfo.pid}, 进程: ${portInfo.processName})`);
    console.error(`   请手动停止占用端口的进程，或使用其他端口`);
    return false;
  }
  
  return true;
}

/**
 * 显示端口管理器状态
 */
export function showPortManagerStatus(): void {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const devKillerEnabled = process.env.ENABLE_DEV_PORT_KILLER === 'true';
  const autoKillEnabled = process.env.AUTO_KILL_PORT_PROCESS === 'true';
  
  console.log('\n📋 端口管理器状态:');
  console.log(`   环境: ${isDevelopment ? '开发环境' : '生产环境'}`);
  console.log(`   开发端口清理器: ${devKillerEnabled ? '✅ 启用' : '❌ 禁用'}`);
  console.log(`   自动杀死进程: ${autoKillEnabled ? '⚠️  启用' : '❌ 禁用'}`);
  
  if (devKillerEnabled || autoKillEnabled) {
    console.log('\n🚨 警告: 危险功能已启用！');
    console.log('   - 此功能会强制杀死占用端口的进程');
    console.log('   - 仅限开发环境使用');
    console.log('   - 生产部署前请务必禁用');
  }
  
  console.log('');
}
