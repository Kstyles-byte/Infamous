-- Add columns for Cloudinary image support to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT,
ADD COLUMN IF NOT EXISTS cloudinary_public_id TEXT;

-- Add comment to explain the columns
COMMENT ON COLUMN profiles.avatar_url IS 'URL to the user profile image stored in Cloudinary';
COMMENT ON COLUMN profiles.cloudinary_public_id IS 'Cloudinary public ID for the profile image, used for image management';

-- Optional: Set default values if needed
-- UPDATE profiles SET avatar_url = NULL WHERE avatar_url IS NULL;
-- UPDATE profiles SET cloudinary_public_id = NULL WHERE cloudinary_public_id IS NULL; 