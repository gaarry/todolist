// Vercel Serverless API for Todo List
// Uses Upstash Redis for persistence

// Check if Upstash is configured
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

// In-memory fallback for development without Redis
let memoryTodos = [
  { id: '1', text: 'Welcome to Reminders!', priority: 'medium', completed: false, createdAt: Date.now(), source: 'system' },
  { id: '2', text: 'Click checkbox to complete', priority: 'low', completed: false, createdAt: Date.now(), source: 'system' },
  { id: '3', text: 'Tasks sync with OpenClaw 🤖', priority: 'high', completed: false, createdAt: Date.now(), source: 'system' }
];

// Redis client (lazy init)
let redis = null;
function getRedis() {
  if (!redis && UPSTASH_URL && UPSTASH_TOKEN) {
    redis = {
      async get(key) {
        const res = await fetch(`${UPSTASH_URL}/get/todos`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        const data = await res.json();
        return data.result;
      },
      async set(key, value) {
        await fetch(`${UPSTASH_URL}/set/todos`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${UPSTASH_TOKEN}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ value })
        });
      }
    };
  }
  return redis;
}

// Storage functions
async function getStorage() {
  const r = getRedis();
  if (r) {
    const data = await r.get('todos');
    if (data) return JSON.parse(data);
  }
  return [...memoryTodos];
}

async function saveStorage(todos) {
  const r = getRedis();
  if (r) {
    await r.set('todos', JSON.stringify(todos));
  } else {
    memoryTodos = todos;
  }
}

// Helper functions
function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}

function error(message, status = 400) {
  return json({ success: false, error: message }, status);
}

// GET /api/todos
export async function GET(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  const todos = await getStorage();
  
  if (path === '/todos' || path === '/' || path === '') {
    return json({ 
      success: true, 
      data: todos, 
      stats: { 
        total: todos.length, 
        completed: todos.filter(t => t.completed).length, 
        pending: todos.filter(t => !t.completed).length 
      } 
    });
  }
  
  const match = path.match(/^\/todos\/(.+)$/);
  if (match) {
    const id = match[1];
    const todo = todos.find(t => t.id === id);
    if (!todo) return error('Todo not found', 404);
    return json({ success: true, data: todo });
  }
  
  return error('Not found', 404);
}

// POST /api/todos
export async function POST(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  if (path !== '/todos' && path !== '/') {
    return error('Not found', 404);
  }
  
  try {
    const body = await request.json();
    if (!body.text || body.text.trim() === '') {
      return error('Text is required', 400);
    }
    
    const todos = await getStorage();
    const todo = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: body.text.trim(),
      priority: body.priority || 'medium',
      completed: false,
      createdAt: Date.now(),
      source: body.source || 'manual',
      metadata: body.metadata || {}
    };
    
    todos.unshift(todo);
    await saveStorage(todos);
    return json({ success: true, data: todo }, 201);
  } catch (e) {
    return error('Invalid request body', 400);
  }
}

// PUT /api/todos/:id
export async function PUT(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  const match = path.match(/^\/todos\/(.+)$/);
  if (!match) return error('Not found', 404);
  
  const id = match[1];
  let todos = await getStorage();
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return error('Todo not found', 404);
  }
  
  try {
    const body = await request.json();
    
    if (body.completed !== undefined) {
      todos[todoIndex].completed = body.completed;
      todos[todoIndex].completedAt = body.completed ? Date.now() : undefined;
    }
    if (body.text !== undefined) {
      todos[todoIndex].text = body.text;
    }
    if (body.priority !== undefined) {
      todos[todoIndex].priority = body.priority;
    }
    todos[todoIndex].updatedAt = Date.now();
    
    await saveStorage(todos);
    return json({ success: true, data: todos[todoIndex] });
  } catch (e) {
    return error('Invalid request', 400);
  }
}

// DELETE /api/todos/:id
export async function DELETE(request) {
  const url = new URL(request.url);
  const path = url.pathname.replace('/api', '');
  
  const match = path.match(/^\/todos\/(.+)$/);
  if (!match) return error('Not found', 404);
  
  const id = match[1];
  let todos = await getStorage();
  const todoIndex = todos.findIndex(t => t.id === id);
  
  if (todoIndex === -1) {
    return error('Todo not found', 404);
  }
  
  const deleted = todos.splice(todoIndex, 1)[0];
  await saveStorage(todos);
  return json({ success: true, data: deleted });
}

// OPTIONS for CORS
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
