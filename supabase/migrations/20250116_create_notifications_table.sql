-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  is_read BOOLEAN DEFAULT false,
  link TEXT, -- Optional link to navigate to when clicked
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies
-- Users can view their own notifications
CREATE POLICY "Users can view their own notifications" 
ON notifications FOR SELECT 
USING (auth.uid() = user_id);

-- Users can update their own notifications (e.g. mark as read)
CREATE POLICY "Users can update their own notifications" 
ON notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- Admins or System can insert notifications (for now, let's allow service role or specific triggers)
-- But for simplicity in this app context, we might want triggers or specific functions.
-- For now, let's allow users to insert notifications for themselves (e.g. for testing) or strictly via triggers.
-- Let's stick to: Only system/triggers usually create notifications, but if we need manual creation:
CREATE POLICY "System/Admins can insert notifications" 
ON notifications FOR INSERT 
WITH CHECK (true); -- In a real app, you'd restrict this. For now, open for development.

-- Create a function to handle new user welcome notification
CREATE OR REPLACE FUNCTION public.handle_new_user_welcome()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.notifications (user_id, title, message, type)
  VALUES (
    new.id,
    'Welcome to ZeroBroker!',
    'Thanks for joining. Complete your profile to get started.',
    'success'
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for welcome notification
DROP TRIGGER IF EXISTS on_auth_user_created_welcome ON auth.users;
CREATE TRIGGER on_auth_user_created_welcome
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user_welcome();
