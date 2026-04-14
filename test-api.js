/**
 * API 测试脚本
 * 测试所有接口功能
 */

const BASE_URL = 'http://localhost:3001';

// 测试数据存储
let testData = {
  userToken: null,
  doctorToken: null,
  userId: null,
  doctorId: null,
  consultationId: null,
  categoryId: null
};

// 辅助函数：发送请求
async function request(method, path, data = null, token = null) {
  const url = `${BASE_URL}${path}`;
  const options = {
    method,
    headers: {
      'Content-Type': 'application/json'
    }
  };

  if (token) {
    options.headers['Authorization'] = `Bearer ${token}`;
  }

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(url, options);
    const result = await response.json();
    return { status: response.status, data: result };
  } catch (error) {
    return { status: 0, error: error.message };
  }
}

// 测试函数
async function test(name, fn) {
  console.log(`\n📝 测试: ${name}`);
  try {
    const result = await fn();
    if (result.success) {
      console.log(`✅ 通过: ${result.message || name}`);
      return { success: true, data: result.data };
    } else {
      console.log(`❌ 失败: ${result.message || '未知错误'}`);
      return { success: false, error: result.message };
    }
  } catch (error) {
    console.log(`❌ 异常: ${error.message}`);
    return { success: false, error: error.message };
  }
}

// ==================== 测试用例 ====================

// 1. 健康检查
async function testHealth() {
  const res = await request('GET', '/health');
  return {
    success: res.data?.success === true,
    message: '健康检查接口正常',
    data: res.data
  };
}

// 2. 用户注册
async function testRegister() {
  const res = await request('POST', '/api/auth/register', {
    phone: '13800138111',
    password: '123456',
    nickname: '测试用户新'
  });
  
  if (res.data?.code === 200) {
    testData.userToken = res.data.data.token;
    testData.userId = res.data.data.user.id;
    return { success: true, message: '用户注册成功', data: res.data };
  }
  
  // 如果已存在，尝试登录
  if (res.data?.code === 409) {
    return testLogin();
  }
  
  return { success: false, message: res.data?.message };
}

// 3. 用户登录
async function testLogin() {
  const res = await request('POST', '/api/auth/login', {
    phone: '13800138000',
    password: '123456'
  });
  
  if (res.data?.code === 200) {
    testData.userToken = res.data.data.token;
    testData.userId = res.data.data.user.id;
    return { success: true, message: '用户登录成功', data: res.data };
  }
  
  return { success: false, message: res.data?.message };
}

// 4. 医生登录
async function testDoctorLogin() {
  const res = await request('POST', '/api/auth/login', {
    phone: '13900139000',
    password: '123456'
  });
  
  if (res.data?.code === 200) {
    testData.doctorToken = res.data.data.token;
    testData.doctorId = res.data.data.user.id;
    return { success: true, message: '医生登录成功', data: res.data };
  }
  
  return { success: false, message: res.data?.message };
}

// 5. 获取首页数据
async function testHomeData() {
  const res = await request('GET', '/api/doctors/home');
  return {
    success: res.data?.code === 200,
    message: '获取首页数据成功',
    data: res.data?.data
  };
}

// 6. 获取医生分类
async function testCategories() {
  const res = await request('GET', '/api/doctors/categories');
  if (res.data?.code === 200 && res.data.data.length > 0) {
    testData.categoryId = res.data.data[0].id;
    return { success: true, message: '获取分类成功', data: res.data };
  }
  return { success: false, message: res.data?.message };
}

// 7. 获取医生列表
async function testDoctors() {
  const res = await request('GET', '/api/doctors?page=1&pageSize=10');
  return {
    success: res.data?.code === 200,
    message: '获取医生列表成功',
    data: res.data?.data
  };
}

// 8. 获取医生详情
async function testDoctorDetail() {
  if (!testData.doctorId) {
    return { success: false, message: '医生ID不存在' };
  }
  const res = await request('GET', `/api/doctors/${testData.doctorId}`);
  return {
    success: res.data?.code === 200,
    message: '获取医生详情成功',
    data: res.data?.data
  };
}

// 9. 获取当前用户信息
async function testGetCurrentUser() {
  const res = await request('GET', '/api/auth/me', null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取当前用户信息成功',
    data: res.data?.data
  };
}

// 10. 发起问诊
async function testCreateConsultation() {
  if (!testData.userToken || !testData.doctorId) {
    return { success: false, message: '缺少必要参数' };
  }
  const res = await request('POST', '/api/consultations', {
    doctorId: testData.doctorId,
    symptoms: '最近感觉胸闷气短，偶尔有心悸的症状，请医生帮忙看看。'
  }, testData.userToken);
  
  if (res.data?.code === 200) {
    testData.consultationId = res.data.data.id;
    return { success: true, message: '发起问诊成功', data: res.data };
  }
  
  return { success: false, message: res.data?.message };
}

// 11. 获取问诊列表（用户）
async function testGetUserConsultations() {
  const res = await request('GET', '/api/consultations?role=user', null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取用户问诊列表成功',
    data: res.data?.data
  };
}

// 12. 获取待接诊列表（医生）
async function testGetPendingConsultations() {
  const res = await request('GET', '/api/consultations/pending', null, testData.doctorToken);
  return {
    success: res.data?.code === 200,
    message: '获取待接诊列表成功',
    data: res.data?.data
  };
}

// 13. 医生接诊
async function testAcceptConsultation() {
  if (!testData.consultationId || !testData.doctorToken) {
    return { success: false, message: '缺少必要参数' };
  }
  const res = await request('POST', `/api/consultations/${testData.consultationId}/accept`, {}, testData.doctorToken);
  return {
    success: res.data?.code === 200,
    message: '医生接诊成功',
    data: res.data?.data
  };
}

// 14. 发送消息
async function testSendMessage() {
  if (!testData.consultationId || !testData.userToken) {
    return { success: false, message: '缺少必要参数' };
  }
  const res = await request('POST', '/api/messages', {
    consultationId: testData.consultationId,
    content: '医生您好，我最近工作压力比较大，经常熬夜。',
    type: 'TEXT'
  }, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '发送消息成功',
    data: res.data?.data
  };
}

// 15. 获取消息列表
async function testGetMessages() {
  if (!testData.consultationId || !testData.userToken) {
    return { success: false, message: '缺少必要参数' };
  }
  const res = await request('GET', `/api/messages/${testData.consultationId}`, null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取消息列表成功',
    data: res.data?.data
  };
}

// 16. 获取未读消息数
async function testGetUnreadCount() {
  const res = await request('GET', '/api/messages/unread', null, testData.doctorToken);
  return {
    success: res.data?.code === 200,
    message: '获取未读消息数成功',
    data: res.data?.data
  };
}

// 17. 获取最近联系人
async function testGetRecentChats() {
  const res = await request('GET', '/api/messages/recent', null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取最近联系人成功',
    data: res.data?.data
  };
}

// 18. 完成问诊
async function testCompleteConsultation() {
  if (!testData.consultationId || !testData.doctorToken) {
    return { success: false, message: '缺少必要参数' };
  }
  const res = await request('POST', `/api/consultations/${testData.consultationId}/complete`, {
    diagnosis: '考虑为工作压力导致的植物神经功能紊乱，建议调整作息。',
    prescription: '建议休息，适当运动，必要时可服用谷维素。'
  }, testData.doctorToken);
  return {
    success: res.data?.code === 200,
    message: '完成问诊成功',
    data: res.data?.data
  };
}

// 19. 获取用户统计
async function testGetUserStats() {
  const res = await request('GET', '/api/users/stats', null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取用户统计成功',
    data: res.data?.data
  };
}

// 20. 获取问诊记录
async function testGetConsultationRecords() {
  const res = await request('GET', '/api/users/records', null, testData.userToken);
  return {
    success: res.data?.code === 200,
    message: '获取问诊记录成功',
    data: res.data?.data
  };
}

// 运行所有测试
async function runAllTests() {
  console.log('╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log('║           🧪 P2P线上问诊 API 测试开始                  ║');
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  const tests = [
    testHealth,
    testLogin,
    testDoctorLogin,
    testGetCurrentUser,
    testHomeData,
    testCategories,
    testDoctors,
    testDoctorDetail,
    testCreateConsultation,
    testGetUserConsultations,
    testGetPendingConsultations,
    testAcceptConsultation,
    testSendMessage,
    testGetMessages,
    testGetUnreadCount,
    testGetRecentChats,
    testCompleteConsultation,
    testGetUserStats,
    testGetConsultationRecords
  ];

  let passed = 0;
  let failed = 0;

  for (const testFn of tests) {
    const result = await test(testFn.name.replace('test', '').replace(/([A-Z])/g, ' $1').trim(), testFn);
    if (result.success) {
      passed++;
    } else {
      failed++;
    }
  }

  console.log('\n╔════════════════════════════════════════════════════════╗');
  console.log('║                                                        ║');
  console.log(`║           🎉 测试完成! 通过: ${passed}, 失败: ${failed}              ║`);
  console.log('║                                                        ║');
  console.log('╚════════════════════════════════════════════════════════╝');

  // 打印测试数据
  console.log('\n📊 测试数据:');
  console.log(JSON.stringify(testData, null, 2));
}

// 运行测试
runAllTests().catch(console.error);
