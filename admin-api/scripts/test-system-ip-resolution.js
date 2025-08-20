/**
 * 测试系统的IP地理位置解析功能
 */
async function testSystemIPResolution() {
  console.log('🔍 测试系统IP地理位置解析功能...\n');

  // 导入我们的IP工具函数
  const { getIPLocation } = require('../src/utils/geoipUtils');

  const testIPs = [
    '125.85.129.215',    // 重庆IP
    '220.181.38.148',    // 北京IP  
    '8.8.8.8'            // 美国IP
  ];

  for (const ip of testIPs) {
    console.log(`\n🔍 测试系统解析 IP: ${ip}`);
    console.log('=' .repeat(40));

    try {
      const result = await getIPLocation(ip);
      
      console.log('✅ 系统解析结果:');
      console.log(`  📍 location: "${result.location}"`);
      console.log(`  🌍 country: "${result.country}"`);
      console.log(`  🏛️  region: "${result.region}"`);
      console.log(`  🏙️  city: "${result.city}"`);
      console.log(`  🌐 provider: "${result.provider}"`);
      
    } catch (error) {
      console.log('❌ 系统解析失败:', error.message);
    }
  }
}

// 运行测试
testSystemIPResolution();
