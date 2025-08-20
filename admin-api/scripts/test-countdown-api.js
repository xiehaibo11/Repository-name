const axios = require('axios');

async function testCountdownAPI() {
  try {
    console.log('🔐 正在登录获取认证令牌...');
    
    // 1. 先登录获取token
    const loginResponse = await axios.post('http://localhost:3001/api/admin/auth/login', {
      username: '1019683427',
      password: 'xie080886'
    });
    
    if (loginResponse.data.status !== 'success') {
      console.error('❌ 登录失败:', loginResponse.data.message);
      return;
    }
    
    const token = loginResponse.data.data.tokens.access_token;
    console.log('✅ 登录成功，获取到token');
    
    // 2. 测试系统状态API
    console.log('🔄 正在测试系统状态API...');

    const statusResponse = await axios.get('http://localhost:3001/api/admin/ssc/status', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 系统状态API响应:', JSON.stringify(statusResponse.data, null, 2));

    // 3. 测试倒计时API
    console.log('🔄 正在测试倒计时API...');

    const countdownResponse = await axios.get('http://localhost:3001/api/admin/ssc/current-countdown', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    console.log('📊 倒计时API响应状态:', countdownResponse.status);
    console.log('📊 倒计时API响应数据:', JSON.stringify(countdownResponse.data, null, 2));

    if (countdownResponse.data.status === 'success') {
      const data = countdownResponse.data.data;
      console.log('✅ 倒计时API测试成功!');
      console.log('📅 当前期号:', data.current_issue?.issue_no || '无');
      console.log('⏰ 倒计时秒数:', data.current_issue?.countdown_seconds || '无');
      console.log('🎲 上期开奖:', data.previous_draw?.issue_no || '无');
      console.log('🔢 开奖号码:', data.previous_draw?.draw_numbers || '无');
      console.log('🔍 系统状态:', {
        is_running: data.system_status?.is_running,
        running: data.system_status?.running
      });
    } else {
      console.error('❌ 倒计时API返回错误:', countdownResponse.data.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

testCountdownAPI();
