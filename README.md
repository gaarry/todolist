# Dream List ✨

A beautiful, minimalist task management app with OpenClaw integration. Deploy to Vercel and connect with your AI assistant.

![Dream List Preview](https://images.unsplash.com/photo-1677442136019-21780ecad995?w=800&q=80)

## Features

- 🎨 **Art-inspired design** - Art Deco meets Brutalist aesthetics
- 🔄 **Real-time sync** - Polls for updates every 10 seconds
- 🤖 **OpenClaw integration** - Auto-add tasks from AI conversations
- 📱 **Responsive** - Works on desktop and mobile
- 🚀 **Serverless** - Deploys to Vercel with zero config
- 💾 **Persistent storage** - In-memory (upgradeable to Redis/KV)

## Quick Deploy

### 1. Deploy to Vercel

```bash
cd todo-list-app
npm install -g vercel
vercel
```

Or click the button:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-username/dream-list)

### 2. Set Environment Variables (Optional)

In Vercel dashboard, add:
- `DREAMLIST_API_URL` - Your API URL (auto-set on deploy)

## API Endpoints

All endpoints return JSON and support CORS.

### GET /api/todos
Get all todos
```bash
curl https://your-app.vercel.app/api/todos
```

### POST /api/todos
Add a new todo
```bash
curl -X POST https://your-app.vercel.app/api/todos \
  -H "Content-Type: application/json" \
  -d '{"text": "Task description", "priority": "high", "source": "openclaw"}'
```

### PUT /api/todos/:id
Update a todo (toggle completion)
```bash
curl -X PUT https://your-app.vercel.app/api/todos/abc123 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

### DELETE /api/todos/:id
Delete a todo
```bash
curl -X DELETE https://your-app.vercel.app/api/todos/abc123
```

## OpenClaw Integration

### Option 1: Monitor Sessions (Recommended)

Run the sync script in the background:

```bash
cd todo-list-app
DREAMLIST_API_URL=https://your-app.vercel.app/api \
  node scripts/openclaw-todo-sync.js
```

This will automatically detect tasks from OpenClaw conversations and add them to your Dream List.

### Option 2: Direct API Call

Add this to your agent prompts or scripts:

```bash
# Using the wrapper script
./scripts/add-todo.sh "Your task here" medium

# Or direct curl
curl -X POST "https://your-app.vercel.app/api/todos" \
  -H "Content-Type: application/json" \
  -d '{"text": "Your task here", "priority": "medium", "source": "openclaw"}'
```

### Task Detection Patterns

The sync script automatically extracts tasks from messages containing:

- "Create a task to..."
- "Remember to..."
- "I need to..."
- "I should..."
- Numbered list items (1. Task name)

## Development

### Local Development

```bash
# Install dependencies
npm install

# Run Vercel dev server
npm run dev
```

The app will be available at `http://localhost:3000`

### Adding to OpenClaw

1. Deploy the app to Vercel
2. Copy the API URL
3. Run the sync script alongside OpenClaw

## Project Structure

```
todo-list-app/
├── api/
│   └── todos.js          # Vercel serverless functions
├── scripts/
│   ├── add-todo.sh       # Bash wrapper for API calls
│   └── openclaw-todo-sync.js  # Session monitor
├── index.html            # Frontend
├── package.json          # Vercel config
├── vercel.json           # Vercel rewrites
└── README.md
```

## Tech Stack

- **Frontend**: Pure HTML/CSS/JS (no frameworks)
- **Backend**: Vercel Serverless Functions
- **Design**: Custom CSS with CSS Variables
- **Fonts**: Abril Fatface, Cormorant Garamond, Space Mono

## Customization

### Colors

Edit `:root` variables in `index.html`:

```css
:root {
  --color-accent: #ff6b35;  /* Main accent color */
  --color-bg: #0a0a0f;       /* Background */
  --color-card: #12121a;     /* Card background */
}
```

### Fonts

Google Fonts used:
- `Abril Fatface` - Display/Headings
- `Cormorant Garamond` - Body text
- `Space Mono` - Technical data

## License

MIT

---

Built with ❤️ for AI agents and humans
