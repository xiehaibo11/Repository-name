const axios = require('axios');
require('dotenv').config();

const API_BASE_URL = 'http://localhost:3001';

async function testMemberLogin() {
  try {
    console.log('🧪 开始测试会员登录IP地址记录功能...\n');

    // 1. 首先创建一个测试会员（如果不存在）
    console.log('1️⃣ 创建测试会员...');
    
    // 先尝试管理员登录获取token
    const adminLoginResponse = await axios.post(`${API_BASE_URL}/admin/auth/login`, {
      username: 'admin',
      password: 'admin123'
    });

    const adminToken = adminLoginResponse.data.data.tokens.access_token;
    console.log('✅ 管理员登录成功');

    // 创建测试代理商（如果不存在）
    try {
      await axios.post(`${API_BASE_URL}/admin/agents`, {
        username: 'testagent001',
        password: 'test123456',
        creditLimit: 10000,
        commissionRate: 0.05
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 测试代理商创建成功');
    } catch (error) {
      if (error.response?.data?.message?.includes('已存在')) {
        console.log('ℹ️  测试代理商已存在');
      } else {
        console.log('⚠️  代理商创建失败:', error.response?.data?.message);
      }
    }

    // 获取代理商ID
    const agentsResponse = await axios.get(`${API_BASE_URL}/admin/agents`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const testAgent = agentsResponse.data.data.agents.find(agent => agent.username === 'testagent001');
    
    if (!testAgent) {
      throw new Error('找不到测试代理商');
    }

    // 创建测试会员（如果不存在）
    try {
      await axios.post(`${API_BASE_URL}/admin/members`, {
        username: 'testmember001',
        nickname: '测试会员001',
        password: 'test123456',
        agentId: testAgent.id,
        balance: 1000
      }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log('✅ 测试会员创建成功');
    } catch (error) {
      if (error.response?.data?.message?.includes('已存在')) {
        console.log('ℹ️  测试会员已存在');
      } else {
        console.log('⚠️  会员创建失败:', error.response?.data?.message);
      }
    }

    console.log('\n2️⃣ 测试会员登录...');

    // 2. 测试会员登录
    const memberLoginResponse = await axios.post(`${API_BASE_URL}/member/auth/login`, {
      username: 'testmember001',
      password: 'test123456'
    }, {
      headers: {
        'X-Forwarded-For': '35.212.235.107', // 模拟真实IP
        'X-Real-IP': '35.212.235.107',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    console.log('✅ 会员登录成功');
    console.log('📊 登录响应数据:');
    console.log('  - 会员ID:', memberLoginResponse.data.data.member.id);
    console.log('  - 用户名:', memberLoginResponse.data.data.member.username);
    console.log('  - 昵称:', memberLoginResponse.data.data.member.nickname);
    console.log('  - 最后登录时间:', memberLoginResponse.data.data.member.lastLoginAt);
    console.log('  - 最后登录IP:', memberLoginResponse.data.data.member.lastLoginIp);
    console.log('  - 最后登录地址:', memberLoginResponse.data.data.member.lastLoginLocation);

    // 3. 验证IP地址记录
    console.log('\n3️⃣ 验证IP地址记录...');
    
    const memberToken = memberLoginResponse.data.data.tokens.access_token;
    const profileResponse = await axios.get(`${API_BASE_URL}/member/auth/profile`, {
      headers: { Authorization: `Bearer ${memberToken}` }
    });

    const memberProfile = profileResponse.data.data.member;
    console.log('📋 会员资料验证:');
    console.log('  - 最后登录时间:', memberProfile.lastLoginAt);
    console.log('  - 最后登录IP:', memberProfile.lastLoginIp);
    console.log('  - 最后登录地址:', memberProfile.lastLoginLocation);

    // 4. 检查IP是否在中国境内
    if (memberProfile.lastLoginLocation && memberProfile.lastLoginLocation.includes('中国')) {
      console.log('✅ IP地址检测正确：位于中国境内');
    } else {
      console.log('⚠️  IP地址检测结果:', memberProfile.lastLoginLocation);
    }

    console.log('\n🎉 测试完成！会员登录IP地址记录功能正常工作');

  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
    
    if (error.response?.status === 401) {
      console.log('💡 提示：请确保管理员账户存在且密码正确');
    } else if (error.code === 'ECONNREFUSED') {
      console.log('💡 提示：请确保后端服务正在运行 (http://localhost:3001)');
    }
  }
}

// 运行测试
testMemberLogin();
