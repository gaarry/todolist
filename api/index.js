// Vercel Serverless API for Todo List
// Uses GitHub Gist for persistent storage
// Supports tags: 'bot' or 'user'

const GIST_ID = process.env.GIST_ID || 'aabff1940df8f8666f76584089a682fd';
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// Initial sample todos
const DEFAULT_TODOS = [
  { id: '1', text: 'Welcome to Reminders!', priority: 'medium', completed: false, createdAt: Date.now(), source: 'system', tag: 'user' },
  { id: '2', text: 'Click checkbox to complete', priority: 'low', completed: false, createdAt: Date.now(), source: 'system', tag: 'user' },
  { id: '3', text: 'Tasks sync with OpenClaw 🤖', priority: 'high', completed: false, createdAt: Date.now(), source: 'system', tag: 'bot' }
];

// GitHub API helper
async function fetchGist() {
  const url = `https://api.github.com/gists/${GIST_ID}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    ...(GITHUB_TOKEN ? { Authorization: `token ${GITHUB_TOKEN}` } : {})
  };
  
  try {
    const res = await fetch(url, { headers });
    if (!res.ok) return null;
    const data = await res.json();
    const content = data.files?.['todos.json']?.content;
    return content ? JSON.parse(content) : null;
  } catch (e) {
    console.error('Failed to fetch gist:', e);
    return null;
  }
}

async function saveGist(todos) {
  if (!GITHUB_TOKEN) {
    console.log('GITHUB_TOKEN not configured, using memory only');
    return false;
  }
  
  const url = `https://api.github.com/gists/${GIST_ID}`;
  const headers = {
    Accept: 'application/vnd.github.v3+json',
    Authorization: `token ${GITHUB_TOKEN}`,
    'Content-Type': 'application/json'
  };
  
  const body = JSON.stringify({
    description: 'Dream List persistent storage',
    public: false,
    files: {
      'todos.json': { content: JSON.stringify(todos, null, 2) }
    }
  });
  
  try {
    const res = await fetch(url, { method: 'PATCH', headers, body });
    return res.ok;
  } catch (e) {
    console.error('Failed to save gist:', e);
    return false;
  }
}

// Storage with Gist fallback
let memoryTodos = [...DEFAULT_TODOS];

async function getStorage() {
  const gistTodos = await fetchGist();
  if (gistTodos && Array.isArray(gistTodos) && gistTodos.length > 0) {
    return gistTodos;
  }
  return [...memoryTodos];
}

async function saveStorage(todos) {
  const saved = await saveGist(todos);
  if (!saved) {
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
  const params = url.searchParams;
  
  // Filter by tag: ?tag=bot or ?tag=user
  const filterTag = params.get('tag');
  const onlyCompleted = params.get('completed') === 'true';
  
  let todos = await getStorage();
  
  // Apply filters
  if (filterTag) {
    todos = todos.filter(t => t.tag === filterTag);
  }
  if (onlyCompleted) {
    todos = todos.filter(t => t.completed);
  }
  
  if (path === '/todos' || path === '/' || path === '') {
    return json({ 
      success: true, 
      data: todos, 
      stats: { 
        total: todos.length, 
        completed: todos.filter(t => t.completed).length, 
        pending: todos.filter(t => !t.completed).length,
        bot: todos.filter(t => t.tag === 'bot').length,
        user: todos.filter(t => t.tag === 'user').length,
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
      metadata: body.metadata || {},
      tag: body.tag || 'user',  // Default to 'user', use 'bot' for bot-generated
      dueDate: body.dueDate || null
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
    if (body.tag !== undefined) {
      todos[todoIndex].tag = body.tag;
    }
    if (body.dueDate !== undefined) {
      todos[todoIndex].dueDate = body.dueDate;
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
