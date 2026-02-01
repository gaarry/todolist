#!/bin/bash

# OpenClaw Tool Wrapper for Dream List
# 
# This script can be called from OpenClaw to add tasks to Dream List
# 
# Usage in OpenClaw:
#   - name: add_todo
#     call: ["bash", "scripts/add-todo.sh", "{text}", "{priority}"]

API_URL="${DREAMLIST_API_URL:-https://your-app.vercel.app/api}"

if [ -z "$1" ]; then
    echo "Usage: $0 <task_text> [priority]"
    echo "  priority: low, medium (default), high"
    exit 1
fi

TEXT="$1"
PRIORITY="${2:-medium}"

curl -s -X POST "$API_URL/todos" \
  -H "Content-Type: application/json" \
  -d "{\"text\": \"$TEXT\", \"priority\": \"$PRIORITY\", \"source\": \"openclaw\"}" | jq '.'

exit 0
