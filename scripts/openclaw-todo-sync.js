#!/usr/bin/env node

/**
 * OpenClaw Integration Script for Dream List
 * 
 * This script monitors OpenClaw sessions and automatically adds tasks to the Dream List.
 * 
 * Setup:
 * 1. Deploy the Dream List app to Vercel
 * 2. Set the API_URL environment variable
 * 3. Run this script to monitor OpenClaw sessions
 * 
 * Usage:
 *   node openclaw-todo-sync.js [--api-url=<url>]
 * 
 * Environment Variables:
 *   API_URL - The URL of your Dream List API (default: http://localhost:3000/api)
 */

const { sessions_history, sessions_list } = require('./tool-routines');

// Configuration
const CONFIG = {
  apiUrl: process.env.API_URL || 'http://localhost:3000/api',
  pollInterval: 5000, // 5 seconds
  maxHistoryItems: 50,
};

// In-memory state
let lastKnownMessages = new Map();
let taskQueue = [];

/**
 * Add a task to the Dream List API
 */
async function addTodo(text, priority = 'medium', metadata = {}) {
  try {
    const response = await fetch(`${CONFIG.apiUrl}/todos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text,
        priority,
        source: 'openclaw',
        metadata
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`✅ Added to Dream List: "${text}"`);
      return true;
    } else {
      console.error(`❌ Failed to add task: ${data.error}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ API Error: ${error.message}`);
    return false;
  }
}

/**
 * Extract task from a message
 * Looks for patterns like:
 * - "Create a task to..."
 * - "Remember to..."
 * - "I need to..."
 */
function extractTask(text) {
  const patterns = [
    /(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:to\s+)?(?:my\s+)?(?:todo\s+)?list[:\s]+(.+)/i,
    /(?:remember\s+to|don't\s+forget\s+to|i(?:'ve| have)\s+to|i(?:'m| am)\s+going\s+to|i\s+need\s+to|i\s+should|i\s+must)\s+(.+)/i,
    /(?:todo|to-do|task):\s*(.+)/i,
    /(?:^|\.\s*)(\d+\.\s+.+)/, // Numbered list items
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let task = match[1].trim();
      // Clean up the task text
      task = task.replace(/[.!?]+$/, ''); // Remove trailing punctuation
      if (task.length > 5 && task.length < 200) {
        return task;
      }
    }
  }
  
  return null;
}

/**
 * Detect task priority from context
 */
function detectPriority(text) {
  const highPriorityPatterns = [
    /urgent|asap|immediately|right now|important|critical|emergency/,
    /!+/,
    /^/,
  ];
  
  const lowPriorityPatterns = [
    /when you have time|eventually|sometime|maybe|later/,
  ];
  
  for (const pattern of highPriorityPatterns) {
    if (pattern.test(text)) return 'high';
  }
  
  for (const pattern of lowPriorityPatterns) {
    if (pattern.test(text)) return 'low';
  }
  
  return 'medium';
}

/**
 * Process a session and extract tasks
 */
async function processSession(sessionKey) {
  try {
    const history = await sessions_history({
      sessionKey,
      limit: 10,
      includeTools: false
    });
    
    if (!history || !history.messages) return;
    
    const sessionId = sessionKey.split(':').pop();
    const lastMessage = history.messages[history.messages.length - 1];
    
    // Skip if we've already processed this message
    if (lastKnownMessages.get(sessionKey) === lastMessage.messageId) {
      return;
    }
    
    // Check for new tasks
    for (const message of history.messages.slice(-5)) {
      if (message.messageId && !lastKnownMessages.has(message.messageId)) {
        const task = extractTask(message.content);
        if (task) {
          const priority = detectPriority(task);
          await addTodo(task, priority, {
            sessionKey,
            messageId: message.messageId,
            timestamp: Date.now()
          });
        }
        lastKnownMessages.set(message.messageId, true);
      }
    }
    
    // Keep memory clean
    if (lastKnownMessages.size > CONFIG.maxHistoryItems * 10) {
      const keysToDelete = Array.from(lastKnownMessages.keys()).slice(0, 100);
      for (const key of keysToDelete) {
        lastKnownMessages.delete(key);
      }
    }
  } catch (error) {
    console.error(`Error processing session ${sessionKey}:`, error.message);
  }
}

/**
 * Main polling loop
 */
async function main() {
  console.log('🚀 OpenClaw Todo Sync Started');
  console.log(`📡 API URL: ${CONFIG.apiUrl}`);
  console.log(`🔄 Poll Interval: ${CONFIG.pollInterval}ms`);
  console.log('---');
  
  // Verify API connection
  try {
    const response = await fetch(`${CONFIG.apiUrl}/todos`);
    if (response.ok) {
      console.log('✅ Connected to Dream List API');
    } else {
      console.error('❌ Failed to connect to Dream List API');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to API: ${error.message}`);
    console.error('Make sure the Dream List app is running.');
    process.exit(1);
  }
  
  console.log('👀 Watching for new tasks...');
  console.log('');
  
  // Main loop
  while (true) {
    try {
      const sessions = await sessions_list({ kinds: ['other'], limit: 20 });
      
      if (sessions && sessions.sessions) {
        for (const session of sessions.sessions) {
          // Only monitor the main session and subagents
          if (session.key.includes('subagent') || session.key === 'agent:main:main') {
            await processSession(session.key);
          }
        }
      }
    } catch (error) {
      console.error('Error in main loop:', error.message);
    }
    
    await new Promise(resolve => setTimeout(resolve, CONFIG.pollInterval));
  }
}

// Run if called directly
if (require.main === module) {
  // Parse command line arguments
  const args = process.argv.slice(2);
  for (const arg of args) {
    if (arg.startsWith('--api-url=')) {
      CONFIG.apiUrl = arg.replace('--api-url=', '');
    } else if (arg === '--help' || arg === '-h') {
      console.log(`
OpenClaw Todo Sync
==================
Monitors OpenClaw sessions and adds tasks to Dream List.

Usage:
  node openclaw-todo-sync.js [options]

Options:
  --api-url=<url>  Set the Dream List API URL
  --help, -h       Show this help message

Environment Variables:
  API_URL          Set the API URL (alternative to --api-url)

Examples:
  node openclaw-todo-sync.js
  API_URL=https://my-todo.vercel.app/api node openclaw-todo-sync.js
`);
      process.exit(0);
    }
  }
  
  main().catch(console.error);
}

module.exports = {
  addTodo,
  extractTask,
  detectPriority,
  processSession
};
