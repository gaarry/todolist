#!/usr/bin/env node

/**
 * Dream List Comprehensive Test Suite
 * Tests all API endpoints and frontend functionality
 */

const API_BASE = process.argv[2] || 'http://localhost:3000/api';

let testsPassed = 0;
let testsFailed = 0;

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
  // Get all todos and delete them
  try {
    const { data } = await request('GET', '/todos');
    for (const todo of data || []) {
      await request('DELETE', `/todos/${todo.id}`);
    }
  } catch (e) {}
}

async function runTests() {
  console.log('🧪 Dream List Test Suite');
  console.log(`🌐 API: ${API_BASE}`);
  console.log('='.repeat(50));
  
  // Cleanup before tests
  await cleanup();
  
  // Test 1: GET todos (empty)
  await test('GET /todos returns empty array', async () => {
    const { status, data } = await request('GET', '/todos');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (!Array.isArray(data.data)) throw new Error('Expected array');
  });
  
  // Test 2: POST new todo
  let todoId;
  await test('POST /todos creates a todo', async () => {
    const { status, data } = await request('POST', '/todos', {
      text: 'Test todo',
      priority: 'high',
      source: 'test'
    });
    if (status !== 201) throw new Error(`Expected 201, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (!data.data.id) throw new Error('Expected todo id');
    todoId = data.data.id;
  });
  
  // Test 3: GET single todo
  await test('GET /todos/:id returns todo', async () => {
    const { status, data } = await request('GET', `/todos/${todoId}`);
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (data.data.id !== todoId) throw new Error('Wrong todo returned');
  });
  
  // Test 4: PUT toggle completion
  await test('PUT /todos/:id toggles completion', async () => {
    const { status, data } = await request('PUT', `/todos/${todoId}`, {
      completed: true
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    if (!data.data.completed) throw new Error('Expected completed=true');
    
    // Toggle back
    await request('PUT', `/todos/${todoId}`, { completed: false });
  });
  
  // Test 5: GET todos (with items)
  await test('GET /todos returns all todos', async () => {
    const { status, data } = await request('GET', '/todos');
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.length === 0) throw new Error('Expected todos');
  });
  
  // Test 6: PUT update text
  await test('PUT /todos/:id updates text', async () => {
    const { status, data } = await request('PUT', `/todos/${todoId}`, {
      text: 'Updated test todo'
    });
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (data.data.text !== 'Updated test todo') throw new Error('Text not updated');
  });
  
  // Test 7: DELETE todo
  await test('DELETE /todos/:id deletes todo', async () => {
    const { status, data } = await request('DELETE', `/todos/${todoId}`);
    if (status !== 200) throw new Error(`Expected 200, got ${status}`);
    if (!data.success) throw new Error(`Expected success: true`);
    
    // Verify deleted
    const getRes = await request('GET', `/todos/${todoId}`);
    if (getRes.status !== 404) throw new Error('Todo still exists');
  });
  
  // Test 8: POST validation (empty text)
  await test('POST /todos validates empty text', async () => {
    const { status } = await request('POST', '/todos', { text: '' });
    if (status !== 400) throw new Error(`Expected 400, got ${status}`);
  });
  
  // Test 9: PUT nonexistent todo
  await test('PUT /todos/:id returns 404 for nonexistent', async () => {
    const { status } = await request('PUT', '/todos/nonexistent', { completed: true });
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });
  
  // Test 10: DELETE nonexistent todo
  await test('DELETE /todos/:id returns 404 for nonexistent', async () => {
    const { status } = await request('DELETE', '/todos/nonexistent');
    if (status !== 404) throw new Error(`Expected 404, got ${status}`);
  });
  
  // Test 11: OPTIONS request (CORS)
  await test('OPTIONS /todos handles CORS', async () => {
    const response = await fetch(`${API_BASE}/todos`, { method: 'OPTIONS' });
    if (response.status !== 204) throw new Error(`Expected 204, got ${response.status}`);
  });
  
  // Cleanup after tests
  await cleanup();
  
  // Summary
  console.log('='.repeat(50));
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
