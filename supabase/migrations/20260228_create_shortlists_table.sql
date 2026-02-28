-- Create shortlists table
CREATE TABLE IF NOT EXISTS shortlists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, property_id)
);

-- Enable RLS
ALTER TABLE shortlists ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own shortlists
CREATE POLICY "Users can view their own shortlists" 
ON shortlists FOR SELECT 
USING (auth.uid() = user_id);

-- Users can insert their own shortlists
CREATE POLICY "Users can insert their own shortlists" 
ON shortlists FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can delete their own shortlists
CREATE POLICY "Users can delete their own shortlists" 
ON shortlists FOR DELETE 
USING (auth.uid() = user_id);
