const http = require('http');

const BASE_URL = 'localhost';
const PORT = 3001;

let userToken = '';
let doctorToken = '';
let adminToken = '';
let userId = '';
let doctorId = '';
let consultationId = '';

const request = (method, path, data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const headers = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const options = {
      hostname: BASE_URL,
      port: PORT,
      path: `/api${path}`,
      method: method,
      headers: headers
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            data: JSON.parse(body)
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            data: body
          });
        }
      });
    });

    req.on('error', reject);
    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const printResult = (testName, status, data) => {
  const statusIcon = status >= 200 && status < 300 ? '✅' : '❌';
  console.log(`${statusIcon} ${testName} - 状态码: ${status}`);
  if (status >= 400) {
    console.log(`   错误信息: ${data.message || JSON.stringify(data)}`);
  }
};

const runTests = async () => {
  console.log('='.repeat(60));
  console.log('P2P 在线问诊 API 测试');
  console.log('='.repeat(60));
  console.log('');

  console.log('--- 1. 健康检查 ---');
  try {
    const res = await request('GET', '/health');
    printResult('健康检查', res.status, res.data);
  } catch (e) {
    console.log(`❌ 健康检查 - 错误: ${e.message}`);
  }

  console.log('');
  console.log('--- 2. 用户认证接口 ---');
  
  console.log('\n2.1 用户注册 - 普通用户:');
  try {
    const res = await request('POST', '/auth/register', {
      username: 'testuser' + Date.now(),
      email: `user${Date.now()}@example.com`,
      password: '123456',
      role: 'USER'
    });
    printResult('用户注册', res.status, res.data);
    if (res.data.data && res.data.data.token) {
      userToken = res.data.data.token;
      userId = res.data.data.user.id;
    }
  } catch (e) {
    console.log(`❌ 用户注册 - 错误: ${e.message}`);
  }

  console.log('\n2.2 用户注册 - 医生用户:');
  try {
    const res = await request('POST', '/auth/register', {
      username: 'doctor' + Date.now(),
      email: `doctor${Date.now()}@example.com`,
      password: '123456',
      role: 'DOCTOR'
    });
    printResult('医生注册', res.status, res.data);
    if (res.data.data && res.data.data.token) {
      doctorToken = res.data.data.token;
    }
  } catch (e) {
    console.log(`❌ 医生注册 - 错误: ${e.message}`);
  }

  console.log('\n2.3 管理员登录:');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'admin@example.com',
      password: 'admin123'
    });
    printResult('管理员登录', res.status, res.data);
    if (res.data.data && res.data.data.token) {
      adminToken = res.data.data.token;
    }
  } catch (e) {
    console.log(`❌ 管理员登录 - 错误: ${e.message}`);
  }

  console.log('\n2.4 获取当前用户信息:');
  try {
    const res = await request('GET', '/auth/me', null, userToken);
    printResult('获取用户信息', res.status, res.data);
  } catch (e) {
    console.log(`❌ 获取用户信息 - 错误: ${e.message}`);
  }

  console.log('');
  console.log('--- 3. 医生分类接口 ---');

  console.log('\n3.1 获取所有分类:');
  try {
    const res = await request('GET', '/doctors/categories');
    printResult('获取分类列表', res.status, res.data);
  } catch (e) {
    console.log(`❌ 获取分类列表 - 错误: ${e.message}`);
  }

  console.log('');
  console.log('--- 4. 医生接口 ---');

  console.log('\n4.1 使用测试医生账号登录:');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'doctor@example.com',
      password: 'doctor123'
    });
    printResult('测试医生登录', res.status, res.data);
    if (res.data.data && res.data.data.token) {
      doctorToken = res.data.data.token;
    }
  } catch (e) {
    console.log(`❌ 测试医生登录 - 错误: ${e.message}`);
  }

  console.log('\n4.2 使用测试用户账号登录:');
  try {
    const res = await request('POST', '/auth/login', {
      email: 'user@example.com',
      password: 'user123'
    });
    printResult('测试用户登录', res.status, res.data);
    if (res.data.data && res.data.data.token) {
      userToken = res.data.data.token;
      userId = res.data.data.user.id;
    }
  } catch (e) {
    console.log(`❌ 测试用户登录 - 错误: ${e.message}`);
  }

  console.log('\n4.4 获取医生列表:');
  try {
    const res = await request('GET', '/doctors');
    printResult('获取医生列表', res.status, res.data);
    if (res.data.data && res.data.data.doctors && res.data.data.doctors.length > 0) {
      doctorId = res.data.data.doctors[0].id;
    }
  } catch (e) {
    console.log(`❌ 获取医生列表 - 错误: ${e.message}`);
  }

  console.log('\n4.5 获取医生详情:');
  if (doctorId) {
    try {
      const res = await request('GET', `/doctors/${doctorId}`);
      printResult('获取医生详情', res.status, res.data);
    } catch (e) {
      console.log(`❌ 获取医生详情 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无可用医生');
  }

  console.log('\n4.6 管理员获取待审核医生:');
  try {
    const res = await request('GET', '/doctors/admin/pending', null, adminToken);
    printResult('获取待审核医生', res.status, res.data);
  } catch (e) {
    console.log(`❌ 获取待审核医生 - 错误: ${e.message}`);
  }

  console.log('');
  console.log('--- 5. 问诊接口 ---');

  console.log('\n5.1 发起问诊:');
  if (doctorId) {
    try {
      const res = await request('POST', '/consultations', {
        doctorId: doctorId,
        title: '头痛咨询',
        description: '最近经常头痛，想咨询一下原因'
      }, userToken);
      printResult('发起问诊', res.status, res.data);
      if (res.data.data && res.data.data.consultation) {
        consultationId = res.data.data.consultation.id;
      }
    } catch (e) {
      console.log(`❌ 发起问诊 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无可用医生');
  }

  console.log('\n5.2 获取我的问诊列表:');
  try {
    const res = await request('GET', '/consultations', null, userToken);
    printResult('获取问诊列表', res.status, res.data);
  } catch (e) {
    console.log(`❌ 获取问诊列表 - 错误: ${e.message}`);
  }

  console.log('\n5.3 更新问诊状态 - 医生接诊:');
  if (consultationId) {
    try {
      const res = await request('PUT', `/consultations/${consultationId}/status`, {
        status: 'ACTIVE'
      }, doctorToken);
      printResult('医生接诊', res.status, res.data);
    } catch (e) {
      console.log(`❌ 医生接诊 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无问诊记录');
  }

  console.log('');
  console.log('--- 6. 消息接口 ---');

  console.log('\n6.1 用户发送消息:');
  if (consultationId) {
    try {
      const res = await request('POST', `/consultations/${consultationId}/messages`, {
        content: '医生您好，我最近经常头痛',
        type: 'text'
      }, userToken);
      printResult('用户发送消息', res.status, res.data);
    } catch (e) {
      console.log(`❌ 用户发送消息 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无问诊记录');
  }

  console.log('\n6.2 医生回复消息:');
  if (consultationId) {
    try {
      const res = await request('POST', `/consultations/${consultationId}/messages`, {
        content: '您好，请详细描述一下头痛的部位和持续时间',
        type: 'text'
      }, doctorToken);
      printResult('医生回复消息', res.status, res.data);
    } catch (e) {
      console.log(`❌ 医生回复消息 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无问诊记录');
  }

  console.log('\n6.3 获取消息列表:');
  if (consultationId) {
    try {
      const res = await request('GET', `/consultations/${consultationId}/messages`, null, userToken);
      printResult('获取消息列表', res.status, res.data);
    } catch (e) {
      console.log(`❌ 获取消息列表 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无问诊记录');
  }

  console.log('\n6.4 结束问诊:');
  if (consultationId) {
    try {
      const res = await request('PUT', `/consultations/${consultationId}/status`, {
        status: 'COMPLETED'
      }, userToken);
      printResult('结束问诊', res.status, res.data);
    } catch (e) {
      console.log(`❌ 结束问诊 - 错误: ${e.message}`);
    }
  } else {
    console.log('⏭️  跳过 - 无问诊记录');
  }

  console.log('');
  console.log('='.repeat(60));
  console.log('测试完成！');
  console.log('='.repeat(60));
};

runTests().catch(console.error);
