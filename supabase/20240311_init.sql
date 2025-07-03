-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist (in reverse order of dependencies)
DROP TABLE IF EXISTS message_status CASCADE;
DROP TABLE IF EXISTS messages CASCADE;
DROP TABLE IF EXISTS conversation_participants CASCADE;
DROP TABLE IF EXISTS conversations CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS job_applications CASCADE;
DROP TABLE IF EXISTS job_posts CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

-- Drop existing functions and triggers
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS update_profile_rating() CASCADE;
DROP FUNCTION IF EXISTS get_unread_message_count(UUID, UUID) CASCADE;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    phone_number TEXT,
    is_worker BOOLEAN DEFAULT false,
    rating DECIMAL(3,2) DEFAULT 0,
    total_reviews INTEGER DEFAULT 0,
    bio TEXT,
    skills TEXT[],
    hourly_rate DECIMAL(10,2),
    availability TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_seen TIMESTAMPTZ DEFAULT NOW()
);

-- Create job_posts table
CREATE TABLE job_posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    budget DECIMAL(10,2),
    location TEXT,
    required_skills TEXT[],
    category TEXT NOT NULL,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    assigned_worker_id UUID REFERENCES profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    deadline TIMESTAMPTZ,
    is_remote BOOLEAN DEFAULT false
);

-- Create job_applications table
CREATE TABLE job_applications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_post_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
    worker_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    cover_letter TEXT,
    proposed_rate DECIMAL(10,2),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_post_id, worker_id)
);

-- Create reviews table
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_post_id UUID REFERENCES job_posts(id) ON DELETE CASCADE,
    reviewer_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reviewed_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(job_post_id, reviewer_id, reviewed_id)
);

-- Create conversations table
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_id UUID,
    last_message_text TEXT,
    last_message_timestamp TIMESTAMPTZ
);

-- Create conversation_participants table
CREATE TABLE conversation_participants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_message_id UUID,
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- Create messages table
CREATE TABLE messages (
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
CREATE TABLE message_status (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    message_id UUID REFERENCES messages(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('delivered', 'read')),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(message_id, user_id)
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_status ENABLE ROW LEVEL SECURITY;

-- Drop existing triggers if they exist
DROP TRIGGER IF EXISTS set_timestamp_profiles ON profiles;
DROP TRIGGER IF EXISTS set_timestamp_job_posts ON job_posts;
DROP TRIGGER IF EXISTS set_timestamp_job_applications ON job_applications;
DROP TRIGGER IF EXISTS set_timestamp_reviews ON reviews;
DROP TRIGGER IF EXISTS set_timestamp_conversations ON conversations;
DROP TRIGGER IF EXISTS set_timestamp_messages ON messages;

-- Create triggers for updated_at
CREATE TRIGGER set_timestamp_profiles
    BEFORE UPDATE ON profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_job_posts
    BEFORE UPDATE ON job_posts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_job_applications
    BEFORE UPDATE ON job_applications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_reviews
    BEFORE UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_conversations
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER set_timestamp_messages
    BEFORE UPDATE ON messages
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Drop existing policies
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Job posts are viewable by everyone" ON job_posts;
DROP POLICY IF EXISTS "Authenticated users can create job posts" ON job_posts;
DROP POLICY IF EXISTS "Authors can update own job posts" ON job_posts;
DROP POLICY IF EXISTS "Workers can view their own applications" ON job_applications;
DROP POLICY IF EXISTS "Workers can create applications" ON job_applications;
DROP POLICY IF EXISTS "Reviews are viewable by everyone" ON reviews;
DROP POLICY IF EXISTS "Users can create reviews for completed jobs" ON reviews;
DROP POLICY IF EXISTS "Users can view their conversations" ON conversations;
DROP POLICY IF EXISTS "Users can view messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can send messages in their conversations" ON messages;

-- Create policies
-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (auth.uid() = id);

CREATE POLICY "Anyone can insert profiles"
ON profiles FOR INSERT
WITH CHECK (true);

-- Job posts policies
CREATE POLICY "Job posts are viewable by everyone"
ON job_posts FOR SELECT
USING (true);

CREATE POLICY "Authenticated users can create job posts"
ON job_posts FOR INSERT
WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Authors can update own job posts"
ON job_posts FOR UPDATE
USING (auth.uid() = author_id);

-- Job applications policies
CREATE POLICY "Workers can view their own applications"
ON job_applications FOR SELECT
USING (
    auth.uid() = worker_id OR 
    auth.uid() IN (
        SELECT author_id FROM job_posts WHERE id = job_post_id
    )
);

CREATE POLICY "Workers can create applications"
ON job_applications FOR INSERT
WITH CHECK (
    auth.uid() = worker_id AND
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND is_worker = true
    )
);

-- Reviews policies
CREATE POLICY "Reviews are viewable by everyone"
ON reviews FOR SELECT
USING (true);

CREATE POLICY "Users can create reviews for completed jobs"
ON reviews FOR INSERT
WITH CHECK (
    auth.uid() = reviewer_id AND
    EXISTS (
        SELECT 1 FROM job_posts
        WHERE id = job_post_id
        AND status = 'completed'
        AND (author_id = auth.uid() OR assigned_worker_id = auth.uid())
    )
);

-- Messaging policies
CREATE POLICY "Users can view their conversations"
ON conversations FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can view messages in their conversations"
ON messages FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can send messages in their conversations"
ON messages FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM conversation_participants
        WHERE conversation_id = messages.conversation_id
        AND user_id = auth.uid()
    )
);

-- Function to update profile rating
CREATE OR REPLACE FUNCTION update_profile_rating()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles
    SET rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM reviews
        WHERE reviewed_id = NEW.reviewed_id
    ),
    total_reviews = (
        SELECT COUNT(*)
        FROM reviews
        WHERE reviewed_id = NEW.reviewed_id
    )
    WHERE id = NEW.reviewed_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating profile rating
DROP TRIGGER IF EXISTS update_profile_rating_trigger ON reviews;
CREATE TRIGGER update_profile_rating_trigger
    AFTER INSERT OR UPDATE ON reviews
    FOR EACH ROW
    EXECUTE FUNCTION update_profile_rating();

-- Function to get unread message count
CREATE OR REPLACE FUNCTION get_unread_message_count(conversation_id_param UUID, user_id_param UUID)
RETURNS INTEGER AS $$
DECLARE
    last_read_message_id UUID;
    unread_count INTEGER;
BEGIN
    SELECT last_read_message_id INTO last_read_message_id
    FROM conversation_participants
    WHERE conversation_id = conversation_id_param
    AND user_id = user_id_param;

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