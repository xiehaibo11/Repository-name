const axios = require('axios');

/**
 * 调试百度API，查看实际返回的数据
 */
async function debugBaiduAPI() {
  console.log('🔍 调试百度API，查看实际返回数据...\n');

  const testIPs = [
    '125.85.129.215',    // 重庆IP
    '220.181.38.148',    // 北京IP
    '8.8.8.8'            // 美国IP
  ];

  for (const ip of testIPs) {
    console.log(`\n🔍 测试IP: ${ip}`);
    console.log('=' .repeat(50));

    try {
      // 使用正确的headers调用百度API
      const response = await axios.get(`https://qifu.baidu.com/ip/geo/v1/district?ip=${ip}`, {
        timeout: 5000,
        headers: {
          'Referer': 'https://qifu.baidu.com/?activeId=SEARCH_IP_ADDRESS&ip=&_frm=aladdin',
          'Host': 'qifu.baidu.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      console.log('📡 百度API完整响应:');
      console.log(JSON.stringify(response.data, null, 2));

      if (response.data.code === 'Success' && response.data.data) {
        const data = response.data.data;
        
        console.log('\n📊 解析的字段:');
        console.log(`  🌍 country: "${data.country}"`);
        console.log(`  🏛️  prov: "${data.prov}"`);
        console.log(`  🏙️  city: "${data.city}"`);
        console.log(`  🏘️  district: "${data.district}"`);
        console.log(`  🌐 isp: "${data.isp}"`);
        console.log(`  🌐 owner: "${data.owner}"`);
        
        // 按照我们的逻辑组装地址
        let location = data.country || '未知国家';
        if (data.prov) location += `, ${data.prov}`;
        if (data.city && data.city !== data.prov) location += `, ${data.city}`;
        if (data.district) location += `, ${data.district}`;
        
        console.log(`\n✅ 组装后的地址: "${location}"`);
        
        // 检查字段是否相等
        if (data.city === data.prov) {
          console.log(`⚠️  注意: city和prov相同，都是 "${data.city}"`);
        }
        
      } else {
        console.log('❌ API返回失败:', response.data);
      }
      
    } catch (error) {
      console.log('❌ 请求失败:', error.message);
      
      if (error.response) {
        console.log('   状态码:', error.response.status);
        console.log('   响应数据:', error.response.data);
      }
    }
  }
}

// 运行调试
debugBaiduAPI();
