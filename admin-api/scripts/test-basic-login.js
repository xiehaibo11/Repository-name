const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testBasicLogin() {
  try {
    console.log('🧪 测试基本会员登录功能...\n');

    console.log('1️⃣ 测试会员登录...');
    
    const response = await axios.post(`${API_BASE_URL}/member/auth/login`, {
      username: 'aa18660',
      password: 'xie080886'
    }, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('✅ 会员登录成功');
    console.log('📊 响应数据:', JSON.stringify(response.data, null, 2));

  } catch (error) {
    if (error.response) {
      console.error('❌ 请求失败:');
      console.error('状态码:', error.response.status);
      console.error('响应数据:', error.response.data);
    } else {
      console.error('❌ 测试失败:', error.message);
    }
  }
}

// 运行测试
testBasicLogin();
