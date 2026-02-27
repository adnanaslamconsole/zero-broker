CREATE TABLE IF NOT EXISTS blog_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  excerpt TEXT,
  content TEXT NOT NULL,
  cover_image_url TEXT,
  category TEXT,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  author_name TEXT,
  status TEXT DEFAULT 'draft',
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Blog posts are readable by everyone"
ON blog_posts
FOR SELECT
USING (true);

CREATE POLICY "Platform admins can insert blog posts"
ON blog_posts
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE POLICY "Platform admins can update blog posts"
ON blog_posts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

CREATE POLICY "Platform admins can delete blog posts"
ON blog_posts
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.id = auth.uid()
    AND 'platform-admin' = ANY(p.roles)
  )
);

