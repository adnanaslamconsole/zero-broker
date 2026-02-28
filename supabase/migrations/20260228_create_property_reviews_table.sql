-- Create property_reviews table
CREATE TABLE IF NOT EXISTS public.property_reviews (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES public.profiles(id) NOT NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5) NOT NULL,
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.property_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can view reviews
CREATE POLICY "Public reviews are viewable by everyone" 
ON public.property_reviews FOR SELECT 
USING (true);

-- Users can insert their own reviews
CREATE POLICY "Users can insert their own reviews" 
ON public.property_reviews FOR INSERT 
WITH CHECK (auth.uid() = user_id);

-- Users can update their own reviews
CREATE POLICY "Users can update their own reviews" 
ON public.property_reviews FOR UPDATE 
USING (auth.uid() = user_id);

-- Users can delete their own reviews
CREATE POLICY "Users can delete their own reviews" 
ON public.property_reviews FOR DELETE 
USING (auth.uid() = user_id);
