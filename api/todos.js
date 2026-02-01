// Vercel Serverless API for Todo List
// Deploy to: https://vercel.com (automatic deployment from GitHub)

// In-memory storage (use Vercel KV or other DB for production)
let todos = [
  {
    id: '1',
    text: 'Welcome to Dream List! 🎯',
    priority: 'medium',
    completed: false,
    createdAt: Date.now(),
    source: 'system'
  },
  {
    id: '2',
    text: 'Click checkbox to complete tasks ✓',
    priority: 'low',
    completed: false,
    createdAt: Date.now(),
    source: 'system'
  },
  {
    id: '3',
    text: 'OpenClaw tasks auto-appear here 🤖',
    priority: 'high',
    completed: false,
    createdAt: Date.now(),
    source: 'system'
  }
];

// GET /api/todos - Get all todos
export async function GET(request) {
  const url = new URL(request.url);
  const onlyPending = url.searchParams.get('pending') === 'true';
  
  let result = [...todos].sort((a, b) => b.createdAt - a.createdAt);
  
  if (onlyPending) {
    result = result.filter(t => !t.completed);
  }
  
  return new Response(JSON.stringify({
    success: true,
    data: result,
    stats: {
      total: todos.length,
      completed: todos.filter(t => t.completed).length,
      pending: todos.filter(t => !t.completed).length
    }
  }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

// POST /api/todos - Add a new todo
export async function POST(request) {
  try {
    const body = await request.json();
    const { text, priority = 'medium', source = 'manual', metadata = {} } = body;
    
    if (!text || text.trim() === '') {
      return new Response(JSON.stringify({
        success: false,
        error: 'Text is required'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const todo = {
      id: Date.now().toString(36) + Math.random().toString(36).substr(2),
      text: text.trim(),
      priority,
      completed: false,
      createdAt: Date.now(),
      source,
      metadata
    };
    
    todos.unshift(todo);
    
    return new Response(JSON.stringify({
      success: true,
      data: todo
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request body'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT /api/todos/:id - Update a todo
export async function PUT(request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    const body = await request.json();
    
    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Todo not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // Update allowed fields
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
    
    return new Response(JSON.stringify({
      success: true,
      data: todos[todoIndex]
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE /api/todos/:id - Delete a todo
export async function DELETE(request) {
  try {
    const url = new URL(request.url);
    const id = url.pathname.split('/').pop();
    
    const todoIndex = todos.findIndex(t => t.id === id);
    
    if (todoIndex === -1) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Todo not found'
      }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    const deleted = todos.splice(todoIndex, 1)[0];
    
    return new Response(JSON.stringify({
      success: true,
      data: deleted
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Invalid request'
    }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle OPTIONS for CORS
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
