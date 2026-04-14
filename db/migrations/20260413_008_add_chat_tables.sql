-- Chat System Tables
-- Created: 2026-04-13

CREATE TABLE IF NOT EXISTS chat_rooms (
  id VARCHAR(100) PRIMARY KEY,
  type VARCHAR(20) NOT NULL CHECK (type IN ('direct', 'group', 'support')),
  name VARCHAR(200),
  created_by VARCHAR(50),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_chat_rooms_type ON chat_rooms(type);
CREATE INDEX idx_chat_rooms_last_message ON chat_rooms(last_message_at);

CREATE TABLE IF NOT EXISTS chat_participants (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  user_id VARCHAR(50) NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_online BOOLEAN DEFAULT false,
  last_seen_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(room_id, user_id)
);

CREATE INDEX idx_chat_participants_room ON chat_participants(room_id);
CREATE INDEX idx_chat_participants_user ON chat_participants(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
  id SERIAL PRIMARY KEY,
  room_id VARCHAR(100) NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
  sender_id VARCHAR(50) NOT NULL,
  sender_name VARCHAR(100) NOT NULL,
  sender_avatar TEXT,
  content TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'text' CHECK (type IN ('text', 'image', 'system')),
  reply_to INTEGER REFERENCES chat_messages(id),
  is_deleted BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX idx_chat_messages_created ON chat_messages(created_at);

CREATE TABLE IF NOT EXISTS chat_message_status (
  id SERIAL PRIMARY KEY,
  message_id INTEGER NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
  room_id VARCHAR(100) NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  UNIQUE(message_id, user_id)
);

CREATE INDEX idx_chat_message_status_user ON chat_message_status(user_id, is_read);

-- GraphQL query logs
CREATE TABLE IF NOT EXISTS graphql_logs (
  id SERIAL PRIMARY KEY,
  query TEXT,
  operation_name VARCHAR(200),
  variables JSONB,
  user_id VARCHAR(50),
  duration_ms INTEGER,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_graphql_logs_created ON graphql_logs(created_at);
CREATE INDEX idx_graphql_logs_user ON graphql_logs(user_id);
