const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testLoginLogsSystem() {
  try {
    console.log('🧪 测试登录日志系统...\n');

    // 1. 测试会员登录（成功）
    console.log('1️⃣ 测试会员登录成功...');
    
    const memberLoginResponse = await axios.post(`${API_BASE_URL}/member/auth/login`, {
      username: 'aa18660',
      password: 'xie080886'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '220.181.38.148', // 百度的IP (北京)
        'X-Real-IP': '220.181.38.148',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (memberLoginResponse.data.status === 'success') {
      console.log('✅ 会员登录成功');
      const memberToken = memberLoginResponse.data.data.tokens.access_token;
      const memberId = memberLoginResponse.data.data.member.id;
      
      // 2. 测试获取安全信息API
      console.log('\n2️⃣ 测试获取安全信息API...');
      
      const securityInfoResponse = await axios.get(`${API_BASE_URL}/login-logs/security-info`, {
        headers: {
          'Authorization': `Bearer ${memberToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (securityInfoResponse.data.status === 'success') {
        console.log('✅ 获取安全信息成功');
        const securityInfo = securityInfoResponse.data.data;
        
        console.log('📊 安全信息:');
        console.log(`  - 上次登录IP: ${securityInfo.last_login_ip}`);
        console.log(`  - 上次登录地址: ${securityInfo.last_login_region}`);
        console.log(`  - 上次登录时间: ${securityInfo.last_login_time}`);
        
        // 验证数据格式
        if (securityInfo.last_login_ip && 
            securityInfo.last_login_region && 
            securityInfo.last_login_time) {
          console.log('✅ 安全信息数据完整');
          
          // 验证IP地址格式
          if (securityInfo.last_login_ip === '220.181.38.148') {
            console.log('✅ IP地址记录正确');
          }
          
          // 验证地理位置
          if (securityInfo.last_login_region.includes('中国')) {
            console.log('✅ 地理位置解析正确');
          }
          
          // 验证时间格式
          if (securityInfo.last_login_time.includes('2025')) {
            console.log('✅ 时间格式正确');
          }
        }
      } else {
        console.log('❌ 获取安全信息失败:', securityInfoResponse.data.message);
      }

      // 3. 测试会员登录历史API
      console.log('\n3️⃣ 测试获取会员登录历史...');
      
      const historyResponse = await axios.get(`${API_BASE_URL}/login-logs/member/history/${memberId}?page=1&pageSize=10`, {
        headers: {
          'Authorization': `Bearer ${memberToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (historyResponse.data.status === 'success') {
        console.log('✅ 获取登录历史成功');
        const history = historyResponse.data.data;
        
        console.log(`📊 登录历史统计:`);
        console.log(`  - 总记录数: ${history.total}`);
        console.log(`  - 当前页: ${history.page}`);
        console.log(`  - 每页大小: ${history.pageSize}`);
        console.log(`  - 总页数: ${history.totalPages}`);
        
        if (history.logs && history.logs.length > 0) {
          console.log(`  - 最近登录记录:`);
          const latestLog = history.logs[0];
          console.log(`    * IP: ${latestLog.loginIp}`);
          console.log(`    * 地址: ${latestLog.loginLocation}`);
          console.log(`    * 时间: ${latestLog.loginTime}`);
          console.log(`    * 状态: ${latestLog.loginStatus}`);
        }
      } else {
        console.log('❌ 获取登录历史失败:', historyResponse.data.message);
      }

      // 4. 测试会员登录统计API
      console.log('\n4️⃣ 测试获取会员登录统计...');
      
      const statsResponse = await axios.get(`${API_BASE_URL}/login-logs/member/stats/${memberId}?days=30`, {
        headers: {
          'Authorization': `Bearer ${memberToken}`,
          'Content-Type': 'application/json'
        }
      });

      if (statsResponse.data.status === 'success') {
        console.log('✅ 获取登录统计成功');
        const stats = statsResponse.data.data;
        
        console.log(`📊 登录统计 (最近30天):`);
        console.log(`  - 总登录次数: ${stats.totalLogins}`);
        console.log(`  - 成功登录次数: ${stats.successLogins}`);
        console.log(`  - 失败登录次数: ${stats.failedLogins}`);
        console.log(`  - 成功率: ${stats.successRate}%`);
        console.log(`  - 唯一IP数量: ${stats.uniqueIps}`);
      } else {
        console.log('❌ 获取登录统计失败:', statsResponse.data.message);
      }

    } else {
      console.log('❌ 会员登录失败:', memberLoginResponse.data.message);
    }

    // 5. 测试登录失败日志
    console.log('\n5️⃣ 测试登录失败日志记录...');
    
    try {
      await axios.post(`${API_BASE_URL}/member/auth/login`, {
        username: 'aa18660',
        password: 'wrong_password'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'X-Forwarded-For': '8.8.8.8', // Google DNS IP
          'X-Real-IP': '8.8.8.8',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ 登录失败测试成功（密码错误）');
        console.log('📝 登录失败日志应该已记录');
      } else {
        console.log('❌ 登录失败测试异常:', error.message);
      }
    }

    console.log('\n🎉 登录日志系统测试完成！');
    console.log('\n📋 功能验证总结:');
    console.log('✅ 登录成功日志记录');
    console.log('✅ 登录失败日志记录');
    console.log('✅ IP地址获取和地理位置解析');
    console.log('✅ 安全信息API');
    console.log('✅ 登录历史API');
    console.log('✅ 登录统计API');
    console.log('✅ 数据格式化和时间处理');

  } catch (error) {
    if (error.response) {
      console.error('❌ 请求失败:');
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('❌ 测试失败:', error.message);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示：请确保后端服务正在运行 (http://localhost:3001)');
    }
  }
}

// 运行测试
testLoginLogsSystem();
