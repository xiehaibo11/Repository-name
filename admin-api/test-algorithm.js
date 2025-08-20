/**
 * 🎯 增强版开奖号码计算算法测试
 * 测试和值、大小单双、龙虎、奇偶统计的计算逻辑
 */

// 增强版开奖号码计算算法
function calculateEnhancedDrawResults(numbers) {
  // 验证输入
  if (!numbers || numbers.length !== 5) {
    throw new Error('开奖号码必须是5位数字');
  }

  // 验证每位数字范围
  for (let i = 0; i < 5; i++) {
    if (numbers[i] < 0 || numbers[i] > 9) {
      throw new Error(`第${i + 1}位数字必须在0-9范围内`);
    }
  }

  // 基础信息
  const draw_numbers = numbers.join(',');
  const [wan_wei, qian_wei, bai_wei, shi_wei, ge_wei] = numbers;

  // 一、和值计算
  const sum_value = numbers.reduce((acc, num) => acc + num, 0);
  
  // 和值大小：23-45为大，0-22为小
  const sum_big_small = sum_value >= 23 ? 'big' : 'small';
  const sum_big_small_cn = sum_value >= 23 ? '大' : '小';
  
  // 和值单双
  const sum_odd_even = sum_value % 2 === 0 ? 'even' : 'odd';
  const sum_odd_even_cn = sum_value % 2 === 0 ? '双' : '单';

  // 二、大小单双组合
  const sum_category = `${sum_big_small_cn}${sum_odd_even_cn}`;

  // 三、龙虎（第一位 vs 第五位）
  let dragon_tiger;
  let dragon_tiger_cn;
  
  if (wan_wei > ge_wei) {
    dragon_tiger = 'dragon';
    dragon_tiger_cn = '龙';
  } else if (wan_wei < ge_wei) {
    dragon_tiger = 'tiger';
    dragon_tiger_cn = '虎';
  } else {
    dragon_tiger = 'tie';
    dragon_tiger_cn = '和';
  }

  // 四、奇偶统计
  let odd_count = 0;
  let even_count = 0;
  
  numbers.forEach(num => {
    if (num % 2 === 0) {
      even_count++;
    } else {
      odd_count++;
    }
  });
  
  const odd_even_pattern = `奇${odd_count}偶${even_count}`;

  // 五、各位数字分析
  const analyzePosition = (num) => ({
    big_small: num >= 5 ? '大' : '小',
    odd_even: num % 2 === 0 ? '偶' : '奇'
  });

  const position_analysis = {
    wan_wei: analyzePosition(wan_wei),
    qian_wei: analyzePosition(qian_wei),
    bai_wei: analyzePosition(bai_wei),
    shi_wei: analyzePosition(shi_wei),
    ge_wei: analyzePosition(ge_wei)
  };

  return {
    // 基础信息
    draw_numbers,
    wan_wei,
    qian_wei,
    bai_wei,
    shi_wei,
    ge_wei,
    
    // 和值信息
    sum_value,
    sum_big_small,
    sum_odd_even,
    sum_big_small_cn,
    sum_odd_even_cn,
    sum_category,
    
    // 龙虎信息
    dragon_tiger,
    dragon_tiger_cn,
    
    // 奇偶统计
    odd_count,
    even_count,
    odd_even_pattern,
    
    // 各位分析
    position_analysis
  };
}

// 测试用例
const testCases = [
  {
    name: '示例1：3,8,2,1,7',
    numbers: [3, 8, 2, 1, 7],
    expected: {
      sum_value: 21,
      sum_big_small_cn: '小',
      sum_odd_even_cn: '单',
      sum_category: '小单',
      dragon_tiger_cn: '虎', // 3 < 7
      odd_count: 3, // 3,1,7
      even_count: 2, // 8,2
      odd_even_pattern: '奇3偶2'
    }
  },
  {
    name: '示例2：7,3,4,2,1',
    numbers: [7, 3, 4, 2, 1],
    expected: {
      sum_value: 17,
      sum_big_small_cn: '小',
      sum_odd_even_cn: '单',
      sum_category: '小单',
      dragon_tiger_cn: '龙', // 7 > 1
      odd_count: 3, // 7,3,1
      even_count: 2, // 4,2
      odd_even_pattern: '奇3偶2'
    }
  },
  {
    name: '示例3：3,6,2,5,8',
    numbers: [3, 6, 2, 5, 8],
    expected: {
      sum_value: 24,
      sum_big_small_cn: '大',
      sum_odd_even_cn: '双',
      sum_category: '大双',
      dragon_tiger_cn: '虎', // 3 < 8
      odd_count: 2, // 3,5
      even_count: 3, // 6,2,8
      odd_even_pattern: '奇2偶3'
    }
  }
];

// 执行测试
console.log('🎯 开始测试增强版开奖号码计算算法\n');

let passedTests = 0;
let totalTests = testCases.length;

for (const testCase of testCases) {
  console.log(`📝 测试：${testCase.name}`);
  console.log(`   输入：[${testCase.numbers.join(', ')}]`);
  
  try {
    const result = calculateEnhancedDrawResults(testCase.numbers);
    
    // 验证结果
    let testPassed = true;
    const errors = [];
    
    // 检查每个期望值
    for (const [key, expectedValue] of Object.entries(testCase.expected)) {
      if (result[key] !== expectedValue) {
        testPassed = false;
        errors.push(`   ❌ ${key}: 期望 ${expectedValue}, 实际 ${result[key]}`);
      }
    }
    
    if (testPassed) {
      console.log('   ✅ 测试通过');
      passedTests++;
    } else {
      console.log('   ❌ 测试失败:');
      errors.forEach(error => console.log(error));
    }
    
    // 显示完整结果
    console.log('   📊 完整结果:');
    console.log(`      开奖号码: ${result.draw_numbers}`);
    console.log(`      和值: ${result.sum_value} (${result.sum_category})`);
    console.log(`      龙虎: ${result.dragon_tiger_cn} (万位${result.wan_wei} vs 个位${result.ge_wei})`);
    console.log(`      奇偶: ${result.odd_even_pattern}`);
    
  } catch (error) {
    console.log(`   ❌ 测试异常: ${error.message}`);
  }
  
  console.log(''); // 空行分隔
}

// 测试总结
console.log('📈 测试总结:');
console.log(`   总测试数: ${totalTests}`);
console.log(`   通过测试: ${passedTests}`);
console.log(`   失败测试: ${totalTests - passedTests}`);
console.log(`   通过率: ${((passedTests / totalTests) * 100).toFixed(1)}%`);

if (passedTests === totalTests) {
  console.log('🎉 所有测试通过！算法实现正确。');
} else {
  console.log('⚠️  部分测试失败，请检查算法实现。');
}

// 随机测试
console.log('\n🎲 随机测试:');
const randomNumbers = Array.from({ length: 5 }, () => Math.floor(Math.random() * 10));
console.log(`   随机号码: [${randomNumbers.join(', ')}]`);

try {
  const result = calculateEnhancedDrawResults(randomNumbers);
  console.log('   📊 计算结果:');
  console.log(`      开奖号码: ${result.draw_numbers}`);
  console.log(`      和值: ${result.sum_value} (${result.sum_category})`);
  console.log(`      龙虎: ${result.dragon_tiger_cn}`);
  console.log(`      奇偶: ${result.odd_even_pattern}`);
  
  // 验证逻辑一致性
  const sumCheck = randomNumbers.reduce((a, b) => a + b, 0);
  const oddCountCheck = randomNumbers.filter(n => n % 2 === 1).length;
  const evenCountCheck = randomNumbers.filter(n => n % 2 === 0).length;
  
  console.log('   🔍 逻辑验证:');
  console.log(`      和值验证: ${sumCheck === result.sum_value ? '✅' : '❌'} (${sumCheck} = ${result.sum_value})`);
  console.log(`      奇偶验证: ${(oddCountCheck === result.odd_count && evenCountCheck === result.even_count) ? '✅' : '❌'} (奇${oddCountCheck}偶${evenCountCheck})`);
  
} catch (error) {
  console.log(`   ❌ 计算异常: ${error.message}`);
}
