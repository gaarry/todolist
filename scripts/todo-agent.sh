#!/bin/bash

# Todo List Agent Command Tool
# 用于 agent 自动管理 todo 任务

API_URL="https://todo-list-app-pearl-six.vercel.app/api/todos"

case "$1" in
  add)
    # 添加任务
    # 用法: ./todo-agent.sh add "任务描述" [bot|user] [priority]
    TEXT="$2"
    TAG="${3:-bot}"
    PRIORITY="${4:-medium}"
    
    curl -s -X POST "$API_URL" \
      -H "Content-Type: application/json" \
      -d "{\"text\":\"$TEXT\",\"tag\":\"$TAG\",\"priority\":\"$PRIORITY\"}"
    echo ""
    ;;
    
  done)
    # 完成任务
    # 用法: ./todo-agent.sh done <任务ID>
    ID="$2"
    curl -s -X PUT "$API_URL/$ID" \
      -H "Content-Type: application/json" \
      -d '{"completed":true}'
    echo ""
    ;;
    
  list)
    # 列出任务
    # 用法: ./todo-agent.sh list [all|bot|user]
    FILTER="${2:-all}"
    if [ "$FILTER" = "all" ]; then
      curl -s "$API_URL"
    else
      curl -s "$API_URL?tag=$FILTER"
    fi
    echo ""
    ;;
    
  bot-tasks)
    # 显示所有 bot 任务
    echo "🤖 Bot 任务:"
    curl -s "$API_URL?tag=bot" | jq -r '.data[] | if .completed then "[✓] " else "[ ] " end + .text' 2>/dev/null || echo "  (无任务)"
    ;;
    
  user-tasks)
    # 显示所有用户任务
    echo "👤 用户任务:"
    curl -s "$API_URL?tag=user" | jq -r '.data[] | if .completed then "[✓] " else "[ ] " end + .text' 2>/dev/null || echo "  (无任务)"
    ;;
    
  pending)
    # 显示待办任务
    echo "📋 待办任务:"
    curl -s "$API_URL" | jq -r '.data[] | select(.completed == false) | "[ ] " + .text + " (" + .tag + ")"' 2>/dev/null || echo "  (无待办)"
    ;;
    
  stats)
    # 显示统计
    echo "📊 Todo 统计:"
    curl -s "$API_URL" | jq '.stats'
    ;;
    
  *)
    echo "Todo Agent Command Tool"
    echo ""
    echo "用法: ./todo-agent.sh <命令> [参数]"
    echo ""
    echo "命令:"
    echo "  add <文本> [tag] [priority]  - 添加任务"
    echo "  done <ID>                    - 完成任务"
    echo "  list [all|bot|user]          - 列出任务"
    echo "  bot-tasks                    - 显示 bot 任务"
    echo "  user-tasks                   - 显示用户任务"
    echo "  pending                      - 显示待办任务"
    echo "  stats                        - 显示统计"
    echo ""
    echo "示例:"
    echo "  ./todo-agent.sh add \"搜索 AI 新闻\" bot high"
    echo "  ./todo-agent.sh done ml36xyz"
    echo "  ./todo-agent.sh list bot"
    echo ""
    ;;
esac
