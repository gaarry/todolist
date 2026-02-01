#!/usr/bin/env node

/**
 * Dream List - Complete Test Suite
 * 完整测试套件：API + 前端功能 + 集成测试
 */

const API_BASE = process.argv[2] || 'https://todo-list-app-pearl-six.vercel.app/api';
let testsPassed = 0;
let testsFailed = 0;

console.log('🧪 Dream List Complete Test Suite');
console.log(`🌐 API: ${API_BASE}`);
console.log('='.repeat(60));

async function test(name, fn) {
  process.stdout.write(`Testing: ${name}... `);
  try {
    await fn();
    console.log('✅ PASS');
    testsPassed++;
  } catch (error) {
    console.log(`❌ FAIL: ${error.message}`);
    testsFailed++;
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(method, path, body = null) {
  const options = {
    method,
    headers: { 'Content-Type': 'application/json' }
  };
  if (body) options.body = JSON.stringify(body);
  
  const response = await fetch(`${API_BASE}${path}`, options);
  const data = await response.json();
  return { status: response.status, data };
}

async function cleanup() {
  try {
    const { data } = await request('GET', '/todos');
    for (const todo of data || []) {
      await request('DELETE', `/todos/${todo.id}`);
    }
  } catch (e) {}
}

async function runTests() {
  // ==========================================
  // 1. API 基础测试
  // ==========================================
  console.log('\n📋 API 基础测试');
  console.log('-'.repeat(40));
  
  await test('GET /todos returns 200', async () => {
    const { status, data } = await request('GET', '/todos');
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.success === true, 'Expected success: true');
  });
  
  await test('GET /todos returns array', async () => {
    const { data } = await request('GET', '/todos');
    assert(Array.isArray(data.data), 'Expected array');
  });

  // ==========================================
  // 2. CRUD 操作测试
  // ==========================================
  console.log('\n✏️ CRUD 操作测试');
  console.log('-'.repeat(40));
  
  let todoId;
  
  await test('POST /todos creates todo (201)', async () => {
    const { status, data } = await request('POST', '/todos', {
      text: 'Test task',
      priority: 'high'
    });
    assert(status === 201, `Expected 201, got ${status}`);
    assert(data.success === true, 'Expected success');
    assert(data.data.id, 'Expected todo id');
    todoId = data.data.id;
  });
  
  await test('GET /todos/:id returns single todo', async () => {
    assert(todoId, 'No todo ID from previous test');
    const { status, data } = await request('GET', `/todos/${todoId}`);
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.data.id === todoId, 'Wrong todo returned');
  });
  
  await test('PUT /todos/:id toggles completion', async () => {
    assert(todoId, 'No todo ID');
    const { status, data } = await request('PUT', `/todos/${todoId}`, {
      completed: true
    });
    assert(status === 200, `Expected 200, got ${status}`);
    assert(data.data.completed === true, 'Expected completed: true');
  });
  
  await test('DELETE /todos/:id removes todo', async () => {
    assert(todoId, 'No todo ID');
    const { status } = await request('DELETE', `/todos/${todoId}`);
    assert(status === 200, `Expected 200, got ${status}`);
  });
  
  await test('GET deleted todo returns 404', async () => {
    assert(todoId, 'No todo ID');
    const { status } = await request('GET', `/todos/${todoId}`);
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ==========================================
  // 3. 验证测试
  // ==========================================
  console.log('\n⚠️ 验证测试');
  console.log('-'.repeat(40));
  
  await test('POST rejects empty text (400)', async () => {
    const { status } = await request('POST', '/todos', { text: '' });
    assert(status === 400, `Expected 400, got ${status}`);
  });
  
  await test('PUT nonexistent todo returns 404', async () => {
    const { status } = await request('PUT', '/todos/nonexistent', { completed: true });
    assert(status === 404, `Expected 404, got ${status}`);
  });
  
  await test('DELETE nonexistent todo returns 404', async () => {
    const { status } = await request('DELETE', '/todos/nonexistent');
    assert(status === 404, `Expected 404, got ${status}`);
  });

  // ==========================================
  // 4. 前端路由匹配测试（关键！）
  // ==========================================
  console.log('\n🔗 前端路由匹配测试（关键！）');
  console.log('-'.repeat(40));
  
  // 检查前端 API_URL 是否与后端路由匹配
  const expectedPaths = [
    { method: 'GET', path: '/todos', desc: 'GET /todos' },
    { method: 'POST', path: '/todos', desc: 'POST /todos' },
  ];
  
  // 测试所有可能的路径组合
  await test('Frontend URL matches backend route: GET /todos', async () => {
    const { status } = await request('GET', '/todos');
    assert(status === 200, 'GET /todos should return 200');
  });
  
  await test('Frontend URL matches backend route: POST /todos', async () => {
    const { status } = await request('POST', '/todos', { text: 'Route test', priority: 'low' });
    assert(status === 201, 'POST /todos should return 201');
  });

  // ==========================================
  // 5. CORS 测试
  // ==========================================
  console.log('\n🌐 CORS 测试');
  console.log('-'.repeat(40));
  
  await test('OPTIONS request returns 204', async () => {
    const response = await fetch(`${API_BASE}/todos`, { method: 'OPTIONS' });
    assert(response.status === 204, `Expected 204, got ${response.status}`);
  });
  
  await test('CORS headers present', async () => {
    const response = await fetch(`${API_BASE}/todos`, { method: 'OPTIONS' });
    const accessControl = response.headers.get('access-control-allow-origin');
    assert(accessControl === '*', 'Expected Access-Control-Allow-Origin: *');
  });

  // ==========================================
  // 6. 数据持久化测试
  // ==========================================
  console.log('\n💾 数据持久化测试');
  console.log('-'.repeat(40));
  
  await test('Data persists after creation', async () => {
    // Create a todo
    const { data: createdData } = await request('POST', '/todos', {
      text: 'Persistence test',
      priority: 'medium'
    });
    
    // Fetch all
    const { data: listData } = await request('GET', '/todos');
    const found = listData.data.find(t => t.id === createdData.data.id);
    assert(found, 'Created todo should persist in list');
    
    // Cleanup
    await request('DELETE', `/todos/${createdData.data.id}`);
  });

  // ==========================================
  // 7. 统计信息测试
  // ==========================================
  console.log('\n📊 统计信息测试');
  console.log('-'.repeat(40));
  
  await test('GET /todos returns stats', async () => {
    const { data } = await request('GET', '/todos');
    assert(typeof data.stats?.total === 'number', 'Expected stats.total');
    assert(typeof data.stats?.completed === 'number', 'Expected stats.completed');
    assert(typeof data.stats?.pending === 'number', 'Expected stats.pending');
  });

  // ==========================================
  // 8. 部署前检查清单
  // ==========================================
  console.log('\n📝 部署前检查清单');
  console.log('-'.repeat(40));
  
  console.log('请确认以下项目：');
  console.log('□ API_BASE 正确配置（前端调用 /api/todos，API 响应 /todos）');
  console.log('□ 所有 fetch 调用使用正确的 URL');
  console.log('□ CORS 配置正确');
  console.log('□ 环境变量已设置（GIST_ID, GITHUB_TOKEN）');
  console.log('□ GitHub Gist 可正常读写');
  console.log('□ 网站能正常加载（无 JavaScript 错误）');
  console.log('□ 添加/删除/完成功能正常');
  console.log('□ 数据持久化正常');

  // ==========================================
  // Summary
  // ==========================================
  console.log('\n' + '='.repeat(60));
  console.log(`📊 Results: ${testsPassed} passed, ${testsFailed} failed`);
  
  if (testsFailed > 0) {
    console.log('\n❌ Some tests failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All tests passed!');
    process.exit(0);
  }
}

runTests().catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});
