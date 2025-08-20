const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001/api';

async function testRealIPLogin() {
  try {
    console.log('🧪 测试真实IP地址的地理位置解析...\n');

    console.log('1️⃣ 使用真实IP地址登录...');
    
    const response = await axios.post(`${API_BASE_URL}/member/auth/login`, {
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

    console.log('✅ 会员登录成功');
    
    const member = response.data.data.member;
    console.log('\n📊 登录信息:');
    console.log(`  - 会员ID: ${member.id}`);
    console.log(`  - 用户名: ${member.username}`);
    console.log(`  - 最后登录时间: ${member.lastLoginAt}`);
    console.log(`  - 最后登录IP: ${member.lastLoginIp}`);
    console.log(`  - 最后登录地址: ${member.lastLoginLocation}`);
    
    // 验证IP地址记录
    if (member.lastLoginIp === '220.181.38.148') {
      console.log('\n✅ IP地址记录正确');
    } else {
      console.log('\n⚠️  IP地址记录可能不正确');
    }
    
    // 验证地理位置解析
    if (member.lastLoginLocation && member.lastLoginLocation !== '内网地址') {
      console.log('✅ 地理位置解析成功');
      
      if (member.lastLoginLocation.includes('中国') || member.lastLoginLocation.includes('北京')) {
        console.log('✅ 地理位置解析准确 (中国/北京)');
      }
    } else {
      console.log('⚠️  地理位置解析可能失败');
    }

    console.log('\n🎉 IP地址记录和地理位置解析功能测试完成！');

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
testRealIPLogin();
