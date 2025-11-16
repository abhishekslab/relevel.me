#!/bin/bash

# Test webhook ingestion with various example payloads
# Usage: ./test-webhook-examples.sh [local|production]

# Set the webhook URL
if [ "$1" == "production" ]; then
  WEBHOOK_URL="https://your-domain.com/api/webhooks/ingest"
else
  WEBHOOK_URL="http://localhost:3000/api/webhooks/ingest"
fi

echo "Testing webhook at: $WEBHOOK_URL"
echo "======================================"

# Example 1: YouTube video notification
echo -e "\n1. Testing YouTube video notification..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "youtube",
    "event_type": "video_published",
    "video_id": "dQw4w9WgXcQ",
    "channel_id": "UC_x5XG1OV2P6uZZ5FSM9Ttw",
    "title": "Amazing AI breakthrough in memory retention",
    "description": "New research shows how AI can help organize thoughts and memories",
    "published_at": "2025-01-15T10:30:00Z"
  }'

echo -e "\n"

# Example 2: Email notification
echo -e "\n2. Testing email notification..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "email",
    "event_type": "email_received",
    "from": "important@example.com",
    "subject": "Meeting notes from today",
    "body": "Key decisions:\n1. Launch new feature next week\n2. Need to update documentation\n3. Schedule follow-up meeting",
    "received_at": "2025-01-15T14:22:00Z"
  }'

echo -e "\n"

# Example 3: n8n workflow output
echo -e "\n3. Testing n8n workflow output..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "n8n",
    "event_type": "workflow_completed",
    "workflow_id": "abc123",
    "workflow_name": "Daily Standup Summary",
    "execution_id": "exec_456",
    "data": {
      "summary": "Completed 5 tasks, 2 blockers identified",
      "tasks_completed": ["Feature A", "Bug fix B", "Documentation C"],
      "blockers": ["API rate limit", "Missing credentials"],
      "next_steps": ["Request increased API quota", "Get access from admin"]
    },
    "timestamp": "2025-01-15T16:00:00Z"
  }'

echo -e "\n"

# Example 4: RSS feed new article
echo -e "\n4. Testing RSS feed article..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "rss",
    "event_type": "new_article",
    "title": "The Future of Personal Knowledge Management",
    "url": "https://example.com/article/pkm-future",
    "author": "Jane Smith",
    "published": "2025-01-15T09:00:00Z",
    "summary": "Exploring how AI assistants are revolutionizing how we capture and retrieve information",
    "tags": ["productivity", "AI", "knowledge-management"]
  }'

echo -e "\n"

# Example 5: Slack message
echo -e "\n5. Testing Slack message capture..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "slack",
    "event_type": "important_message",
    "channel": "#engineering",
    "user": "alice",
    "message": "Great insight in today'\''s meeting - we should document this pattern for future reference",
    "timestamp": "2025-01-15T11:30:00Z",
    "thread_context": "Discussion about API design patterns"
  }'

echo -e "\n"

# Example 6: Custom reminder
echo -e "\n6. Testing custom reminder..."
curl -X POST "$WEBHOOK_URL" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "YOUR_USER_ID_HERE",
    "source": "manual",
    "event_type": "reminder",
    "title": "Weekly review",
    "content": "Review this week'\''s memories and set goals for next week",
    "priority": "high",
    "scheduled_for": "2025-01-19T18:00:00Z"
  }'

echo -e "\n"

echo "======================================"
echo "All webhook tests completed!"
echo ""
echo "To check processing status:"
echo "  1. Check worker logs for LLM processing"
echo "  2. Query webhook_events table in Supabase"
echo "  3. Check messages table for created memories"
echo ""
echo "Note: Replace 'YOUR_USER_ID_HERE' with actual user UUID from Supabase"
