-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    firebase_uid TEXT UNIQUE NOT NULL,
    display_name TEXT NOT NULL,
    photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Create trigger for profiles updated_at
DROP TRIGGER IF EXISTS set_timestamp ON profiles;
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Create conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_id UUID,
    last_message_text TEXT,
    last_message_timestamp TIMESTAMPTZ
);

-- Create conversation_participants table
CREATE TABLE IF NOT EXISTS conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    message_text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    reply_to_message_id UUID REFERENCES messages(id),
    message_type TEXT DEFAULT 'text'
);

-- Create message_status table
CREATE TABLE IF NOT EXISTS message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'read')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow public read access to profiles" ON profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow service role to manage profiles" ON profiles;
DROP POLICY IF EXISTS "Allow insert access to profiles" ON profiles;

DROP POLICY IF EXISTS "Allow participants to view conversations" ON conversations;
DROP POLICY IF EXISTS "Allow participants to insert conversations" ON conversations;
DROP POLICY IF EXISTS "Allow participants to update conversations" ON conversations;

DROP POLICY IF EXISTS "Allow participants to view messages" ON messages;
DROP POLICY IF EXISTS "Allow participants to insert messages" ON messages;
DROP POLICY IF EXISTS "Allow sender to update own messages" ON messages;

DROP POLICY IF EXISTS "Allow participants to view message status" ON message_status;
DROP POLICY IF EXISTS "Allow participants to update message status" ON message_status;

-- Create policies for profiles table
CREATE POLICY "Allow public read access to profiles"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Allow users to update own profile"
ON profiles FOR UPDATE
USING (firebase_uid = auth.uid()::text)
WITH CHECK (firebase_uid = auth.uid()::text);

CREATE POLICY "Allow service role to manage profiles"
ON profiles FOR ALL
USING (
    CASE 
        WHEN auth.jwt() IS NOT NULL THEN (auth.jwt()->>'role')::text = 'service_role'
        ELSE false
    END
)
WITH CHECK (
    CASE 
        WHEN auth.jwt() IS NOT NULL THEN (auth.jwt()->>'role')::text = 'service_role'
        ELSE false
    END
);

CREATE POLICY "Allow insert access to profiles"
ON profiles FOR INSERT
WITH CHECK (true);

-- Create policies for conversations table
CREATE POLICY "Allow participants to view conversations"
ON conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        JOIN profiles p ON p.id = cp.user_id
        WHERE cp.conversation_id = conversations.id
        AND p.firebase_uid = auth.uid()::text
    )
);

CREATE POLICY "Allow participants to insert conversations"
ON conversations FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow participants to update conversations"
ON conversations FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        JOIN profiles p ON p.id = cp.user_id
        WHERE cp.conversation_id = conversations.id
        AND p.firebase_uid = auth.uid()::text
    )
);

-- Create policies for conversation_participants table
CREATE POLICY "Allow participants to view conversation participants"
ON conversation_participants FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = conversation_participants.user_id
        AND p.firebase_uid = auth.uid()::text
    )
);

CREATE POLICY "Allow participants to insert conversation participants"
ON conversation_participants FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow participants to update conversation participants"
ON conversation_participants FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = conversation_participants.user_id
        AND p.firebase_uid = auth.uid()::text
    )
);

-- Create policies for messages table
CREATE POLICY "Allow participants to view messages"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        JOIN profiles p ON p.id = cp.user_id
        WHERE cp.conversation_id = messages.conversation_id
        AND p.firebase_uid = auth.uid()::text
    )
);

CREATE POLICY "Allow participants to insert messages"
ON messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversation_participants cp
        JOIN profiles p ON p.id = cp.user_id
        WHERE cp.conversation_id = messages.conversation_id
        AND p.firebase_uid = auth.uid()::text
    )
);

CREATE POLICY "Allow sender to update own messages"
ON messages FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM profiles p
        WHERE p.id = messages.sender_id
        AND p.firebase_uid = auth.uid()::text
    )
);

-- Create policies for message_status table
CREATE POLICY "Allow participants to view message status"
ON message_status FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        JOIN profiles p ON p.id = cp.user_id
        WHERE m.id = message_status.message_id
        AND p.firebase_uid = auth.uid()::text
    )
);

CREATE POLICY "Allow participants to update message status"
ON message_status FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM messages m
        JOIN conversation_participants cp ON cp.conversation_id = m.conversation_id
        JOIN profiles p ON p.id = cp.user_id
        WHERE m.id = message_status.message_id
        AND p.firebase_uid = auth.uid()::text
    )
);

-- Create function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(conversation_id_param UUID, user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    last_read_message_id UUID;
    unread_count INTEGER;
BEGIN
    -- Get the last read message ID for the user in this conversation
    SELECT last_read_message_id INTO last_read_message_id
    FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = user_id_param;

    -- Count messages after the last read message
    SELECT COUNT(*) INTO unread_count
    FROM messages
    WHERE conversation_id = conversation_id_param
    AND (
        last_read_message_id IS NULL
        OR created_at > (
            SELECT created_at
            FROM messages
            WHERE id = last_read_message_id
        )
    )
    AND sender_id != user_id_param
    AND is_deleted = false;

    RETURN unread_count;
END;
$$ LANGUAGE plpgsql; 