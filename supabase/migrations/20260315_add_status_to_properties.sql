-- Add status column to properties table to resolve trigger conflicts and support archiving
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'archived', 'pending', 'rejected'));

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_properties_status ON public.properties(status);

-- Update check_listing_limit trigger to use the new status column if it was previously broken
CREATE OR REPLACE FUNCTION public.check_listing_limit()
RETURNS TRIGGER AS $$
DECLARE
  v_max_listings INTEGER;
  v_current_listings INTEGER;
BEGIN
  -- Get max listings for user's active plan
  SELECT pp.max_listings INTO v_max_listings
  FROM public.user_subscriptions us
  JOIN public.pricing_plans pp ON us.plan_id = pp.id
  WHERE us.user_id = NEW.owner_id AND us.status = 'active';

  -- Default to 0 if no plan found
  v_max_listings := COALESCE(v_max_listings, 0);

  -- Count current active listings using the new status column
  SELECT count(*) INTO v_current_listings
  FROM public.properties
  WHERE owner_id = NEW.owner_id AND status = 'active';

  -- Enforce limit
  IF v_current_listings >= v_max_listings THEN
    RAISE EXCEPTION 'Listing limit reached for your current plan. Please upgrade to post more properties.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
