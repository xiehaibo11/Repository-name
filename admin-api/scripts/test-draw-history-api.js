const http = require('http');

async function testDrawHistoryAPI() {
  try {
    console.log('🧪 测试开奖历史API...');
    
    // 测试API调用
    const url = 'http://localhost:3001/api/admin/lottery/draw/history?lotteryTypeId=1&page=1&pageSize=10';
    console.log(`📡 请求URL: ${url}`);
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        // 注意：实际使用时需要有效的认证token
        'Authorization': 'Bearer test-token'
      }
    });
    
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    console.log('📋 API响应:', JSON.stringify(result, null, 2));
    
    if (result.status === 'success') {
      console.log(`✅ API调用成功，返回 ${result.data.length} 条记录`);
      
      // 显示前3条记录的详细信息
      result.data.slice(0, 3).forEach((record, index) => {
        console.log(`\n${index + 1}. 期号: ${record.issue_no}`);
        console.log(`   开奖号码: ${record.draw_numbers}`);
        console.log(`   和值: ${record.sum_value} (${record.sum_big_small}${record.sum_odd_even})`);
        console.log(`   开奖时间: ${record.draw_time}`);
        console.log(`   开奖方式: ${record.draw_method}`);
        console.log(`   状态: ${record.draw_status}`);
      });
    } else {
      console.log('❌ API调用失败:', result.message);
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function testWithoutAuth() {
  try {
    console.log('\n🧪 测试不带认证的API调用...');
    
    const url = 'http://localhost:3001/api/admin/lottery/draw/history?lotteryTypeId=1&page=1&pageSize=5';
    
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log(`📊 响应状态: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    console.log('📋 API响应:', JSON.stringify(result, null, 2));
    
  } catch (error) {
    console.error('❌ 测试失败:', error.message);
  }
}

async function main() {
  await testDrawHistoryAPI();
  await testWithoutAuth();
  console.log('\n🎉 API测试完成！');
}

// 运行测试
if (require.main === module) {
  main();
}
