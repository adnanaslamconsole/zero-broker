-- Create societies table
CREATE TABLE IF NOT EXISTS societies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  city TEXT NOT NULL,
  locality TEXT NOT NULL,
  address TEXT NOT NULL,
  total_flats INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  admin_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create society members table
CREATE TABLE IF NOT EXISTS society_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES societies(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  flat_no TEXT NOT NULL,
  role TEXT DEFAULT 'resident', -- 'admin', 'resident', 'security'
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(society_id, user_id)
);

-- Create visitors table
CREATE TABLE IF NOT EXISTS visitors (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES societies(id) NOT NULL,
  flat_no TEXT NOT NULL,
  visitor_name TEXT NOT NULL,
  phone TEXT,
  purpose TEXT,
  entry_time TIMESTAMPTZ DEFAULT now(),
  exit_time TIMESTAMPTZ,
  status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'denied'
  created_by UUID REFERENCES auth.users(id) -- Security guard or resident who pre-approved
);

-- Create maintenance records table
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES societies(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id), -- Nullable if not yet linked to a user, but linked to flat_no? Better linked to user.
  flat_no TEXT NOT NULL,
  month TEXT NOT NULL, -- 'January 2024'
  amount NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  status TEXT DEFAULT 'pending', -- 'pending', 'paid', 'overdue'
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create complaints table
CREATE TABLE IF NOT EXISTS complaints (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES societies(id) NOT NULL,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL, -- 'maintenance', 'security', 'billing', 'other'
  status TEXT DEFAULT 'open', -- 'open', 'in-progress', 'resolved'
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create notices table
CREATE TABLE IF NOT EXISTS notices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  society_id UUID REFERENCES societies(id) NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE societies ENABLE ROW LEVEL SECURITY;
ALTER TABLE society_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices ENABLE ROW LEVEL SECURITY;

-- Policies
-- Societies: Publicly viewable (for search/join), insert by authenticated users
CREATE POLICY "Societies viewable by everyone" ON societies FOR SELECT USING (true);
CREATE POLICY "Users can create societies" ON societies FOR INSERT WITH CHECK (auth.uid() = admin_id);

-- Members: Viewable by members of same society
CREATE POLICY "Members viewable by society members" ON society_members FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM society_members sm 
    WHERE sm.society_id = society_members.society_id 
    AND sm.user_id = auth.uid()
  )
  OR user_id = auth.uid()
);
CREATE POLICY "Users can join society" ON society_members FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Visitors: Viewable by residents of the flat or security/admin
CREATE POLICY "Visitors viewable by relevant users" ON visitors FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM society_members sm 
    WHERE sm.society_id = visitors.society_id 
    AND sm.user_id = auth.uid()
    AND (sm.flat_no = visitors.flat_no OR sm.role IN ('admin', 'security'))
  )
);
CREATE POLICY "Users can log visitors" ON visitors FOR INSERT WITH CHECK (true); -- Ideally stricter

-- Maintenance: Viewable by own user or admin
CREATE POLICY "Maintenance viewable by owner or admin" ON maintenance_records FOR SELECT
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM society_members sm 
    WHERE sm.society_id = maintenance_records.society_id 
    AND sm.user_id = auth.uid()
    AND sm.role = 'admin'
  )
);

-- Complaints: Viewable by members
CREATE POLICY "Complaints viewable by society members" ON complaints FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM society_members sm 
    WHERE sm.society_id = complaints.society_id 
    AND sm.user_id = auth.uid()
  )
);
CREATE POLICY "Users can create complaints" ON complaints FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Notices: Viewable by members
CREATE POLICY "Notices viewable by society members" ON notices FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM society_members sm 
    WHERE sm.society_id = notices.society_id 
    AND sm.user_id = auth.uid()
  )
);
