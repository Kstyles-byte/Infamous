-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  firebase_uid TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  photo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Add firebase_uid column if it doesn't exist
DO $$ 
BEGIN 
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'profiles' 
    AND column_name = 'firebase_uid'
  ) THEN
    ALTER TABLE profiles ADD COLUMN firebase_uid TEXT UNIQUE;
  END IF;
END $$;

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create message_status table
CREATE TABLE IF NOT EXISTS message_status (
  message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  PRIMARY KEY (message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Anyone can view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Anyone can insert profiles" ON profiles;
DROP POLICY IF EXISTS "Users can view own conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view conversation participants" ON conversation_participants;
DROP POLICY IF EXISTS "Users can view conversation messages" ON messages;
DROP POLICY IF EXISTS "Users can insert messages to their conversations" ON messages;
DROP POLICY IF EXISTS "Users can manage own message status" ON message_status;

-- Create policies
-- Profiles: Anyone can view, only owner can update, anyone can insert
CREATE POLICY "Anyone can view profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = firebase_uid);
CREATE POLICY "Anyone can insert profiles" ON profiles FOR INSERT WITH CHECK (true);

-- Conversations: Users can only access conversations they're part of
CREATE POLICY "Users can view own conversations" ON conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = conversations.id
      AND p.firebase_uid = auth.uid()::text
    )
  );

-- Conversation participants: Users can view participants of their conversations
CREATE POLICY "Users can view conversation participants" ON conversation_participants
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = conversation_participants.user_id
      AND p.firebase_uid = auth.uid()::text
    )
  );

-- Messages: Users can only access messages from their conversations
CREATE POLICY "Users can view conversation messages" ON messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = messages.conversation_id
      AND p.firebase_uid = auth.uid()::text
    )
  );

CREATE POLICY "Users can insert messages to their conversations" ON messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM conversation_participants cp
      JOIN profiles p ON cp.user_id = p.id
      WHERE cp.conversation_id = messages.conversation_id
      AND p.firebase_uid = auth.uid()::text
    )
  );

-- Message status: Users can manage their own message status
CREATE POLICY "Users can manage own message status" ON message_status
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = message_status.user_id
      AND p.firebase_uid = auth.uid()::text
    )
  );

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(conversation_id_param UUID, user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
  unread_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO unread_count
  FROM messages m
  LEFT JOIN message_status ms ON m.id = ms.message_id AND ms.user_id = user_id_param
  WHERE m.conversation_id = conversation_id_param
  AND (ms.read_at IS NULL OR ms.read_at > m.created_at);
  
  RETURN unread_count;
END;
$$ LANGUAGE plpgsql; 