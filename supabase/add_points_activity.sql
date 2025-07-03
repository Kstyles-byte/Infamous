-- Create points activity table to track point changes
CREATE TABLE IF NOT EXISTS points_activity (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add last_login_date column to profiles if it doesn't exist
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS last_login_date TIMESTAMPTZ;

-- Create RLS policy for points_activity
ALTER TABLE points_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own points activity"
ON points_activity FOR SELECT
USING (auth.uid() = user_id);

-- Create updated_at trigger for points_activity table
CREATE TRIGGER set_timestamp_points_activity
  BEFORE UPDATE ON points_activity
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column(); 