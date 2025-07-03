-- Create comment_likes table
CREATE TABLE IF NOT EXISTS public.comment_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
    UNIQUE(comment_id, user_id)
);

-- Create functions for incrementing/decrementing comment likes
CREATE OR REPLACE FUNCTION increment_comment_likes(comment_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE comments
  SET likes_count = likes_count + 1
  WHERE id = comment_id_param;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement_comment_likes(comment_id_param UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE comments
  SET likes_count = GREATEST(0, likes_count - 1)
  WHERE id = comment_id_param;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for comment likes
CREATE OR REPLACE FUNCTION handle_new_comment_like()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM increment_comment_likes(NEW.comment_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION handle_deleted_comment_like()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM decrement_comment_likes(OLD.comment_id);
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Drop existing triggers
DROP TRIGGER IF EXISTS on_comment_like_created ON public.comment_likes;
DROP TRIGGER IF EXISTS on_comment_like_deleted ON public.comment_likes;

-- Create triggers
CREATE TRIGGER on_comment_like_created
  AFTER INSERT ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_comment_like();

CREATE TRIGGER on_comment_like_deleted
  AFTER DELETE ON public.comment_likes
  FOR EACH ROW
  EXECUTE FUNCTION handle_deleted_comment_like();

-- Enable Row Level Security
ALTER TABLE public.comment_likes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies first
DROP POLICY IF EXISTS "Anyone can view comment likes" ON public.comment_likes;
DROP POLICY IF EXISTS "Authenticated users can like comments" ON public.comment_likes;
DROP POLICY IF EXISTS "Users can unlike their own comment likes" ON public.comment_likes;

-- Create policies
-- Everyone can view comment likes
CREATE POLICY "Anyone can view comment likes"
  ON public.comment_likes
  FOR SELECT
  USING (true);

-- Only authenticated users can like comments
CREATE POLICY "Authenticated users can like comments"
  ON public.comment_likes
  FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Users can unlike (delete) their own comment likes
CREATE POLICY "Users can unlike their own comment likes"
  ON public.comment_likes
  FOR DELETE
  USING (auth.uid() = user_id); 