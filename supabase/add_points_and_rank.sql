-- Migration to add points and rank system to profiles table

-- Add points and rank columns to profiles table if they don't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS points INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rank TEXT DEFAULT 'Beginner';

-- Create ranks configuration table to store rank thresholds
CREATE TABLE IF NOT EXISTS ranks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  min_points INTEGER NOT NULL,
  max_points INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create function to update rank based on points
CREATE OR REPLACE FUNCTION update_user_rank()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the rank based on the current points
  IF NEW.points < 100 THEN
    NEW.rank := 'Beginner';
  ELSIF NEW.points < 300 THEN
    NEW.rank := 'Apprentice';
  ELSIF NEW.points < 700 THEN
    NEW.rank := 'Skilled';
  ELSIF NEW.points < 1500 THEN
    NEW.rank := 'Expert';
  ELSIF NEW.points < 3000 THEN
    NEW.rank := 'Master';
  ELSE
    NEW.rank := 'Grandmaster';
  END IF;

  -- If rank has changed, create a notification
  IF TG_OP = 'UPDATE' AND OLD.rank IS DISTINCT FROM NEW.rank THEN
    INSERT INTO notifications (
      user_id,
      type,
      title,
      message,
      data,
      is_read
    ) VALUES (
      NEW.id,
      'rank_change',
      'Rank Promotion!',
      'Congratulations! You''ve been promoted to ' || NEW.rank,
      jsonb_build_object('old_rank', OLD.rank, 'new_rank', NEW.rank),
      FALSE
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update rank when points change
CREATE TRIGGER update_rank_trigger
BEFORE UPDATE OF points ON profiles
FOR EACH ROW
EXECUTE FUNCTION update_user_rank();

-- Create notifications table if it doesn't exist
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create RLS policy for notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
ON notifications FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
ON notifications FOR UPDATE
USING (auth.uid() = user_id);

-- Insert initial rank definitions
INSERT INTO ranks (name, min_points, max_points)
VALUES
  ('Beginner', 0, 99),
  ('Apprentice', 100, 299),
  ('Skilled', 300, 699),
  ('Expert', 700, 1499),
  ('Master', 1500, 2999),
  ('Grandmaster', 3000, 2147483647)
ON CONFLICT DO NOTHING; 