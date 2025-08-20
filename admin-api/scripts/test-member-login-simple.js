const axios = require('axios');

const API_BASE_URL = 'http://localhost:3001';

async function testMemberLoginIP() {
  try {
    console.log('🧪 测试会员登录IP地址记录功能...\n');

    // 测试会员登录
    console.log('1️⃣ 测试会员登录...');
    
    // 使用正确的测试账户
    const testAccounts = [
      { username: 'aa18660', password: 'xie080886' },
      { username: 'member001', password: 'member123' },
      { username: 'member001', password: '123456' }
    ];

    let memberLoginResponse = null;
    let successAccount = null;

    for (const account of testAccounts) {
      try {
        console.log(`尝试登录: ${account.username} / ${account.password}`);

        memberLoginResponse = await axios.post(`${API_BASE_URL}/member/auth/login`, {
          username: account.username,
          password: account.password
        }, {
          headers: {
            'X-Forwarded-For': '220.181.38.148', // 模拟百度的IP (北京)
            'X-Real-IP': '220.181.38.148',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        if (memberLoginResponse.data.status === 'success') {
          successAccount = account;
          console.log(`✅ 登录成功: ${account.username}`);
          break;
        }
      } catch (error) {
        console.log(`❌ 登录失败: ${account.username} - ${error.response?.data?.message || error.message}`);
        continue;
      }
    }

    if (!successAccount) {
      console.log('❌ 所有测试账户都登录失败');
      return;
    }

    if (memberLoginResponse.data.status === 'success') {
      console.log('✅ 会员登录成功');
      const member = memberLoginResponse.data.data.member;
      
      console.log('📊 登录信息:');
      console.log(`  - 会员ID: ${member.id}`);
      console.log(`  - 用户名: ${member.username}`);
      console.log(`  - 昵称: ${member.nickname}`);
      console.log(`  - 最后登录时间: ${member.lastLoginAt}`);
      console.log(`  - 最后登录IP: ${member.lastLoginIp}`);
      console.log(`  - 最后登录地址: ${member.lastLoginLocation}`);
      
      if (member.lastLoginIp && member.lastLoginLocation) {
        console.log('\n🎉 IP地址记录功能正常工作！');
        
        if (member.lastLoginLocation.includes('中国')) {
          console.log('✅ IP地理位置解析正确：位于中国境内');
        }
      } else {
        console.log('\n⚠️  IP地址记录可能未正常工作');
      }
    } else {
      console.log('❌ 会员登录失败:', memberLoginResponse.data.message);
    }

  } catch (error) {
    if (error.response) {
      console.error('❌ 请求失败:', error.response.data);
    } else {
      console.error('❌ 测试失败:', error.message);
    }
    
    if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示：请确保后端服务正在运行 (http://localhost:3001)');
    }
  }
}

// 运行测试
testMemberLoginIP();
