const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testSingleLogin() {
  try {
    console.log('🧪 测试单次登录，查看详细日志...\n');

    console.log('1️⃣ 测试重庆IP登录...');
    
    const response = await axios.post(`${API_BASE_URL}/member/auth/login`, {
      username: 'aa18660',
      password: 'xie080886'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'X-Forwarded-For': '125.85.129.215', // 重庆IP
        'X-Real-IP': '125.85.129.215',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (response.data.status === 'success') {
      console.log('✅ 登录成功');
      const member = response.data.data.member;
      
      console.log('📊 返回的登录信息:');
      console.log(`  - 最后登录IP: ${member.lastLoginIp}`);
      console.log(`  - 最后登录地址: ${member.lastLoginLocation}`);
      
    } else {
      console.log('❌ 登录失败:', response.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ 请求失败:', error.response.data);
    } else {
      console.error('❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
testSingleLogin();
