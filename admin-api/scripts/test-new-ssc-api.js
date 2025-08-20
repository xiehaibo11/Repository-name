/**
 * 测试新的分分时时彩API接口
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3001/api';

async function testSSCAPI() {
  console.log('🧪 开始测试新的分分时时彩API接口...\n');

  try {
    // 1. 测试系统状态
    console.log('1️⃣ 测试系统状态接口...');
    const statusResponse = await axios.get(`${BASE_URL}/ssc/status`);
    console.log('✅ 系统状态:', JSON.stringify(statusResponse.data, null, 2));
    console.log('');

    // 2. 测试倒计时接口
    console.log('2️⃣ 测试倒计时接口...');
    const countdownResponse = await axios.get(`${BASE_URL}/ssc/countdown`);
    console.log('✅ 倒计时信息:', JSON.stringify(countdownResponse.data, null, 2));
    console.log('');

    // 3. 测试赔率配置接口
    console.log('3️⃣ 测试赔率配置接口...');
    const oddsResponse = await axios.get(`${BASE_URL}/ssc/odds`);
    console.log('✅ 赔率配置:', JSON.stringify(oddsResponse.data, null, 2));
    console.log('');

    // 4. 测试健康检查接口
    console.log('4️⃣ 测试健康检查接口...');
    const healthResponse = await axios.get(`${BASE_URL}/ssc/health`);
    console.log('✅ 健康检查:', JSON.stringify(healthResponse.data, null, 2));
    console.log('');

    // 5. 测试最新开奖结果接口
    console.log('5️⃣ 测试最新开奖结果接口...');
    const latestResponse = await axios.get(`${BASE_URL}/ssc/latest-result`);
    console.log('✅ 最新开奖结果:', JSON.stringify(latestResponse.data, null, 2));
    console.log('');

    // 6. 测试历史开奖记录接口
    console.log('6️⃣ 测试历史开奖记录接口...');
    const historyResponse = await axios.get(`${BASE_URL}/ssc/history?page=1&limit=5`);
    console.log('✅ 历史开奖记录:', JSON.stringify(historyResponse.data, null, 2));
    console.log('');

    console.log('🎉 所有API接口测试完成！');

  } catch (error) {
    console.error('❌ API测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testSSCAPI();
