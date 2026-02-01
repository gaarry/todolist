#!/usr/bin/env node

/**
 * Todo List Auto-Sync Agent
 * 自动将所有任务同步到 Todo List 网站
 * 
 * 使用方法:
 * - 导入此模块: require('./todo-sync')
 * - 调用 addTask(text, priority, tag) 添加任务
 * - 调用 completeTask(id) 完成任务
 */

const API_URL = process.env.TODO_API_URL || 'https://todo-list-app-pearl-six.vercel.app/api/todos';

// 自动添加任务的包装函数
async function addTask(text, priority = 'medium', tag = 'bot') {
  const todo = {
    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
    text,
    priority,
    tag,
    completed: false,
    createdAt: Date.now(),
    source: 'auto-sync',
    metadata: {}
  };

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(todo)
    });
    const data = await response.json();
    if (data.success) {
      console.log(`✅ [TODO] Added: "${text}"`);
      return data.data.id;
    }
  } catch (e) {
    console.error(`❌ [TODO] Failed: ${e.message}`);
  }
  return null;
}

// 完成任务
async function completeTask(id) {
  try {
    const response = await fetch(`${API_URL}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: true })
    });
    const data = await response.json();
    if (data.success) {
      console.log(`✅ [TODO] Completed: "${data.data.text}"`);
      return true;
    }
  } catch (e) {
    console.error(`❌ [TODO] Complete failed: ${e.message}`);
  }
  return false;
}

// 获取所有任务
async function getTasks(tag = null) {
  const url = tag ? `${API_URL}?tag=${tag}` : API_URL;
  const response = await fetch(url);
  const data = await response.json();
  return data.data || [];
}

// 获取待办任务
async function getPending() {
  const tasks = await getTasks();
  return tasks.filter(t => !t.completed);
}

// 打印任务列表
async function printTasks(filter = 'all') {
  console.log('\n📋 Todo List');
  console.log('='.repeat(50));
  
  const tasks = await getTasks(filter === 'all' ? null : filter);
  
  if (tasks.length === 0) {
    console.log('(无任务)');
    return;
  }
  
  for (const task of tasks) {
    const status = task.completed ? '✓' : ' ';
    const tag = task.tag === 'bot' ? '🤖' : '👤';
    console.log(`[${status}] ${tag} ${task.text}`);
  }
  
  console.log('='.repeat(50));
}

module.exports = {
  addTask,
  completeTask,
  getTasks,
  getPending,
  printTasks
};

// 如果直接运行，打印任务列表
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0] || 'list';
  
  if (command === 'list') {
    printTasks(args[1] || 'all');
  } else if (command === 'add') {
    const text = args.slice(2).join(' ');
    if (text) {
      addTask(text, args[1] || 'medium', args[2] || 'bot');
    } else {
      console.log('用法: node todo-sync.js add <priority> <tag> <text>');
    }
  } else if (command === 'done') {
    completeTask(args[1]);
  } else if (command === 'pending') {
    getPending().then(tasks => {
      console.log('\n📋 待办任务');
      tasks.forEach(t => console.log(`[ ] ${t.text} (${t.tag})`));
    });
  }
}
