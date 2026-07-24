-- Add feedback_prompt_last_shown column to profiles table
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS feedback_prompt_last_shown TIMESTAMP WITH TIME ZONE;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_feedback_prompt_last_shown
ON profiles(feedback_prompt_last_shown);
