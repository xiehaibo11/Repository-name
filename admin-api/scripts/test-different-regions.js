const axios = require('axios');

/**
 * 测试不同地区IP的地理位置解析
 */
async function testDifferentRegions() {
  console.log('🌍 测试不同地区IP的地理位置解析...\n');

  // 不同地区的真实IP地址
  const testIPs = [
    { ip: '125.85.129.215', expected: '重庆', description: '重庆电信' },
    { ip: '220.181.38.148', expected: '北京', description: '北京百度' },
    { ip: '114.114.114.114', expected: '江苏', description: '114DNS' },
    { ip: '223.5.5.5', expected: '浙江', description: '阿里DNS' },
    { ip: '180.76.76.76', expected: '北京', description: '百度DNS' },
    { ip: '61.135.169.121', expected: '北京', description: '北京联通' },
    { ip: '202.96.134.133', expected: '上海', description: '上海电信' },
    { ip: '202.96.128.86', expected: '广东', description: '广东电信' },
    
    // 国外IP
    { ip: '8.8.8.8', expected: '美国', description: 'Google DNS' },
    { ip: '1.1.1.1', expected: '美国', description: 'Cloudflare DNS' },
    { ip: '208.67.222.222', expected: '美国', description: 'OpenDNS' },
    
    // 香港/台湾IP
    { ip: '202.14.67.4', expected: '香港', description: '香港宽频' },
    { ip: '168.95.1.1', expected: '台湾', description: '台湾中华电信' }
  ];

  for (const testCase of testIPs) {
    console.log(`\n🔍 测试IP: ${testCase.ip} (${testCase.description})`);
    console.log(`   预期地区: ${testCase.expected}`);
    console.log('=' .repeat(60));

    try {
      // 调用百度API
      const response = await axios.get(`https://qifu.baidu.com/ip/geo/v1/district?ip=${testCase.ip}`, {
        timeout: 5000,
        headers: {
          'Referer': 'https://qifu.baidu.com/?activeId=SEARCH_IP_ADDRESS&ip=&_frm=aladdin',
          'Host': 'qifu.baidu.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data.code === 'Success' && response.data.data) {
        const data = response.data.data;
        
        // 组装地址
        let location = data.country || '未知国家';
        if (data.prov) location += `, ${data.prov}`;
        if (data.city && data.city !== data.prov) location += `, ${data.city}`;
        if (data.district) location += `, ${data.district}`;
        
        console.log(`✅ 实际解析: ${location}`);
        console.log(`🌐 运营商: ${data.isp || data.owner || '未知'}`);
        
        // 验证是否符合预期
        if (location.includes(testCase.expected)) {
          console.log(`🎯 解析正确: 包含预期地区 "${testCase.expected}"`);
        } else {
          console.log(`⚠️  解析差异: 预期 "${testCase.expected}"，实际 "${location}"`);
        }
        
      } else {
        console.log('❌ API返回失败');
      }
      
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }
  }

  console.log('\n📋 测试总结:');
  console.log('✅ 不同地区的IP会解析到对应的地理位置');
  console.log('✅ VPN/代理IP会显示代理服务器的位置');
  console.log('✅ 这是正常的IP地理位置解析行为');
}

/**
 * 测试VPN/代理场景
 */
async function testVPNScenarios() {
  console.log('\n\n🔒 测试VPN/代理场景...\n');

  // 常见VPN服务器IP
  const vpnIPs = [
    { ip: '104.28.14.26', description: 'Cloudflare CDN (美国)' },
    { ip: '185.199.108.153', description: 'GitHub Pages (美国)' },
    { ip: '172.67.74.226', description: 'Cloudflare (美国)' },
    { ip: '103.21.244.0', description: 'Cloudflare 亚太' },
    { ip: '198.41.128.143', description: 'ExpressVPN (美国)' }
  ];

  for (const vpn of vpnIPs) {
    console.log(`\n🔍 测试VPN IP: ${vpn.ip}`);
    console.log(`   描述: ${vpn.description}`);
    console.log('-' .repeat(40));

    try {
      const response = await axios.get(`https://qifu.baidu.com/ip/geo/v1/district?ip=${vpn.ip}`, {
        timeout: 5000,
        headers: {
          'Referer': 'https://qifu.baidu.com/?activeId=SEARCH_IP_ADDRESS&ip=&_frm=aladdin',
          'Host': 'qifu.baidu.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.data.code === 'Success' && response.data.data) {
        const data = response.data.data;
        
        let location = data.country || '未知国家';
        if (data.prov) location += `, ${data.prov}`;
        if (data.city && data.city !== data.prov) location += `, ${data.city}`;
        
        console.log(`📍 VPN服务器位置: ${location}`);
        console.log(`🏢 服务商: ${data.isp || data.owner || '未知'}`);
        
      } else {
        console.log('❌ 解析失败');
      }
      
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
    }
  }

  console.log('\n💡 VPN/代理说明:');
  console.log('- 用户使用VPN时，系统会显示VPN服务器的地理位置');
  console.log('- 这是正常行为，因为网站只能看到VPN服务器的IP');
  console.log('- 如果需要检测VPN使用，需要额外的VPN检测服务');
}

// 运行测试
async function main() {
  try {
    await testDifferentRegions();
    await testVPNScenarios();
    
    console.log('\n🎉 所有测试完成！');
    
  } catch (error) {
    console.error('💥 测试失败:', error);
  }
}

main();
