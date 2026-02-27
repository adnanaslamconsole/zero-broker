-- Complete setup for Pricing Plans and Subscriptions
-- Run this entire script to fix "relation does not exist" errors

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  price_monthly NUMERIC NOT NULL,
  is_recommended BOOLEAN DEFAULT false,
  max_listings INTEGER,
  highlight_listings BOOLEAN DEFAULT false,
  priority_support BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) NOT NULL,
  plan_id UUID REFERENCES public.pricing_plans(id) NOT NULL,
  status TEXT DEFAULT 'active',
  started_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Enable RLS
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- 3. Setup Policies (Drop first to ensure clean state)

-- Pricing Plans Policies
DROP POLICY IF EXISTS "Pricing plans are readable by everyone" ON public.pricing_plans;
CREATE POLICY "Pricing plans are readable by everyone"
ON public.pricing_plans FOR SELECT USING (true);

DROP POLICY IF EXISTS "Only service role can modify pricing plans" ON public.pricing_plans;
CREATE POLICY "Only service role can modify pricing plans"
ON public.pricing_plans FOR ALL
USING (auth.role() = 'service_role')
WITH CHECK (auth.role() = 'service_role');

-- User Subscriptions Policies
DROP POLICY IF EXISTS "Users can read their own subscription" ON public.user_subscriptions;
CREATE POLICY "Users can read their own subscription"
ON public.user_subscriptions FOR SELECT
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create their subscription" ON public.user_subscriptions;
CREATE POLICY "Users can create their subscription"
ON public.user_subscriptions FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their subscription" ON public.user_subscriptions;
CREATE POLICY "Users can update their subscription"
ON public.user_subscriptions FOR UPDATE
USING (auth.uid() = user_id);

-- 4. Insert/Update Data (Upsert)
INSERT INTO public.pricing_plans (code, name, description, price_monthly, is_recommended, max_listings, highlight_listings, priority_support)
VALUES
  (
    'free',
    'Free',
    'Perfect to list your first property with zero brokerage.',
    0,
    false,
    1,
    false,
    false
  ),
  (
    'plus',
    'Plus',
    'Boost visibility and reach more serious tenants and buyers.',
    999,
    true,
    5,
    true,
    true
  ),
  (
    'pro',
    'Pro',
    'For power users and brokers managing multiple properties at scale.',
    2499,
    false,
    20,
    true,
    true
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  price_monthly = EXCLUDED.price_monthly,
  is_recommended = EXCLUDED.is_recommended,
  max_listings = EXCLUDED.max_listings,
  highlight_listings = EXCLUDED.highlight_listings,
  priority_support = EXCLUDED.priority_support;
