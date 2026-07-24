-- Create user_feedbacks table
CREATE TABLE IF NOT EXISTS user_feedbacks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  type VARCHAR(50) DEFAULT 'general' CHECK (type IN ('bug', 'feature-request', 'complaint', 'general')),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'treated')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create index on user_id and status for faster queries
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_user_id ON user_feedbacks(user_id);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_status ON user_feedbacks(status);
CREATE INDEX IF NOT EXISTS idx_user_feedbacks_created_at ON user_feedbacks(created_at DESC);

-- Enable RLS
ALTER TABLE user_feedbacks ENABLE ROW LEVEL SECURITY;

-- RLS Policies
-- Users can read their own feedback
CREATE POLICY "Users can read their own feedback"
  ON user_feedbacks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can insert their own feedback
CREATE POLICY "Users can insert their own feedback"
  ON user_feedbacks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can read all feedback
CREATE POLICY "Admins can read all feedback"
  ON user_feedbacks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update feedback status
CREATE POLICY "Admins can update feedback"
  ON user_feedbacks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
