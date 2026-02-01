#!/usr/bin/env node

/**
 * Simplified OpenClaw Todo Sync
 * Polls OpenClaw sessions directory and monitors sessions for tasks.
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  apiUrl: process.env.DREAMLIST_API_URL || 'https://todo-list-app-pearl-six.vercel.app/api',
  pollInterval: 10000, // 10 seconds
  sessionsDir: path.join(process.env.HOME || '/Users/gary', '.openclaw/agents/main/sessions'),
};

// State
let processedFiles = new Set();

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
        tag: 'bot',  // Mark as bot-generated task
        source: 'openclaw',
        metadata
      })
    });
    
    const data = await response.json();
    if (data.success) {
      console.log(`✅ [BOT] Added: "${text}"`);
      return true;
    }
    return false;
  } catch (error) {
    console.error(`❌ Failed to add "${text}": ${error.message}`);
    return false;
  }
}

/**
 * Extract task from text using patterns
 */
function extractTask(text) {
  const patterns = [
    /(?:create|add|make)\s+(?:a\s+)?(?:new\s+)?task\s+(?:to\s+)?(?:my\s+)?(?:todo\s+)?list[:\s]+(.+)/i,
    /(?:remember\s+to|don't\s+forget\s+to|i(?:'ve| have)\s+to|i(?:'m| am)\s+going\s+to|i\s+need\s+to|i\s+should|i\s+must)\s+(.+)/i,
    /(?:todo|to-do|task):\s*(.+)/i,
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let task = match[1].trim().replace(/[.!?]+$/, '');
      if (task.length > 5 && task.length < 200) {
        return task;
      }
    }
  }
  return null;
}

/**
 * Detect priority from context
 */
function detectPriority(text) {
  if (/urgent|asap|immediately|important|critical|!/i.test(text)) return 'high';
  if (/when you have time|eventually|sometime|maybe|later/i.test(text)) return 'low';
  return 'medium';
}

/**
 * Process a transcript file
 */
async function processTranscript(filePath) {
  if (processedFiles.has(filePath)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    
    for (const line of lines) {
      try {
        const data = JSON.parse(line);
        const message = data.message || data.content || '';
        const messageId = data.messageId || data.id;
        
        if (messageId && !processedFiles.has(messageId)) {
          const task = extractTask(message);
          if (task) {
            const priority = detectPriority(message);
            await addTodo(task, priority, {
              filePath,
              messageId,
              timestamp: Date.now()
            });
          }
          processedFiles.add(messageId);
        }
      } catch (e) {
        // Skip invalid JSON lines
      }
    }
  } catch (error) {
    // File might not exist or be readable
  }
}

/**
 * Find and process all session transcripts
 */
async function scanSessions() {
  try {
    if (!fs.existsSync(CONFIG.sessionsDir)) return;
    
    const files = fs.readdirSync(CONFIG.sessionsDir);
    
    for (const file of files) {
      if (file.endsWith('.jsonl')) {
        const filePath = path.join(CONFIG.sessionsDir, file);
        await processTranscript(filePath);
      }
    }
  } catch (error) {
    // Directory might not exist
  }
}

/**
 * Main loop
 */
async function main() {
  console.log('🚀 OpenClaw Todo Sync Started');
  console.log(`📡 API: ${CONFIG.apiUrl}`);
  console.log(`📁 Sessions: ${CONFIG.sessionsDir}`);
  console.log(`🔄 Poll: ${CONFIG.pollInterval}ms`);
  console.log('---');
  
  // Test API connection
  try {
    const response = await fetch(`${CONFIG.apiUrl}/todos`);
    if (response.ok) {
      console.log('✅ Connected to Dream List API\n');
    } else {
      console.error('❌ API not accessible');
      process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Cannot connect to API: ${error.message}`);
    process.exit(1);
  }
  
  console.log('👀 Watching for tasks...\n');
  
  // Initial scan
  await scanSessions();
  
  // Main loop
  setInterval(async () => {
    await scanSessions();
  }, CONFIG.pollInterval);
}

// Run
main().catch(console.error);
