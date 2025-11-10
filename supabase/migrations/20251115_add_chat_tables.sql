-- =====================================================
-- Chat Tables Migration
-- =====================================================
--
-- Adds support for LLM-powered avatar conversations
-- Includes: conversations and chat_messages tables
-- with comprehensive RLS policies
--
-- =====================================================

-- =====================================================
-- TABLE: conversations
-- =====================================================
-- Stores chat conversation sessions
-- Each user can have multiple conversations with the avatar
-- =====================================================

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster user conversation queries
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO authenticated;

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for conversations table
CREATE POLICY "conversations_select_own"
  ON conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "conversations_insert_own"
  ON conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_update_own"
  ON conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "conversations_delete_own"
  ON conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Trigger to update updated_at
CREATE TRIGGER update_conversations_updated_at
  BEFORE UPDATE ON conversations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE conversations IS
  'Chat conversation sessions between user and AI avatar';

-- =====================================================
-- TABLE: chat_messages
-- =====================================================
-- Individual messages within conversations
-- Stores both user and assistant messages
-- =====================================================

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('system', 'user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX idx_chat_messages_conversation_id ON chat_messages(conversation_id);
CREATE INDEX idx_chat_messages_created_at ON chat_messages(created_at DESC);
CREATE INDEX idx_chat_messages_conversation_created ON chat_messages(conversation_id, created_at ASC);

-- Grant table-level permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON chat_messages TO authenticated;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chat_messages table
-- Users can only access messages from their own conversations
CREATE POLICY "chat_messages_select_own"
  ON chat_messages FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_insert_own"
  ON chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

-- Messages should generally not be updated, but allow if needed
CREATE POLICY "chat_messages_update_own"
  ON chat_messages FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

CREATE POLICY "chat_messages_delete_own"
  ON chat_messages FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM conversations
      WHERE conversations.id = chat_messages.conversation_id
      AND conversations.user_id = auth.uid()
    )
  );

COMMENT ON TABLE chat_messages IS
  'Individual chat messages between user and AI avatar within conversations';

-- =====================================================
-- HELPER FUNCTION: Get active conversation for user
-- =====================================================
-- Helper to get or create the user's most recent conversation

CREATE OR REPLACE FUNCTION get_or_create_conversation(p_user_id UUID)
RETURNS UUID AS $$
DECLARE
  v_conversation_id UUID;
BEGIN
  -- Try to get the most recent conversation (within last 24 hours)
  SELECT id INTO v_conversation_id
  FROM conversations
  WHERE user_id = p_user_id
    AND created_at > NOW() - INTERVAL '24 hours'
  ORDER BY created_at DESC
  LIMIT 1;

  -- If no recent conversation exists, create a new one
  IF v_conversation_id IS NULL THEN
    INSERT INTO conversations (user_id, title)
    VALUES (p_user_id, 'Chat ' || TO_CHAR(NOW(), 'YYYY-MM-DD'))
    RETURNING id INTO v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_or_create_conversation IS
  'Gets the most recent conversation (within 24h) or creates a new one for the user';
