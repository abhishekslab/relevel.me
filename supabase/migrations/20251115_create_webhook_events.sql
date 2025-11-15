-- Create webhook_events table for flexible webhook ingestion
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT NOT NULL, -- e.g., 'youtube', 'email', 'n8n', 'manual'
  event_type TEXT, -- flexible classification field
  payload JSONB NOT NULL, -- raw incoming webhook data
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  processing_result JSONB, -- stores LLM response, actions taken, etc.
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add indexes for common queries
CREATE INDEX idx_webhook_events_user_id ON webhook_events(user_id);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_source ON webhook_events(source);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX idx_webhook_events_user_status ON webhook_events(user_id, status);

-- Enable RLS
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can view their own webhook events
CREATE POLICY "Users can view own webhook events"
  ON webhook_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can insert webhook events (for API route)
CREATE POLICY "Service role can insert webhook events"
  ON webhook_events
  FOR INSERT
  WITH CHECK (true);

-- Service role can update webhook events (for worker processing)
CREATE POLICY "Service role can update webhook events"
  ON webhook_events
  FOR UPDATE
  USING (true);

-- Auto-update updated_at timestamp
CREATE TRIGGER update_webhook_events_updated_at
  BEFORE UPDATE ON webhook_events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Add comment for documentation
COMMENT ON TABLE webhook_events IS 'Stores incoming webhook events from various sources (YouTube, email, n8n, etc.) for async LLM processing';
