-- Migration to automatically assign free plan and enforce one-listing limit for free users

-- 1. Update handle_new_user to automatically assign free plan to new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  free_plan_id UUID;
BEGIN
  -- Get the free plan ID
  SELECT id INTO free_plan_id FROM public.pricing_plans WHERE code = 'free';

  -- Create profile
  INSERT INTO public.profiles (id, email, mobile, name, primary_role, roles)
  VALUES (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'tenant'),
    ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'tenant')]
  );

  -- Assign free plan automatically
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status)
    VALUES (new.id, free_plan_id, 'active')
    ON CONFLICT (user_id) DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Backfill existing users who don't have a subscription
DO $$
DECLARE
  free_plan_id UUID;
BEGIN
  SELECT id INTO free_plan_id FROM public.pricing_plans WHERE code = 'free';
  
  IF free_plan_id IS NOT NULL THEN
    INSERT INTO public.user_subscriptions (user_id, plan_id, status)
    SELECT id, free_plan_id, 'active'
    FROM public.profiles
    WHERE id NOT IN (SELECT user_id FROM public.user_subscriptions)
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
END;
$$;

-- 3. Add a check function and trigger to enforce listing limits at database level
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

  -- Default to 0 if no plan found (should not happen with backfill)
  v_max_listings := COALESCE(v_max_listings, 0);

  -- Count current active listings
  SELECT count(*) INTO v_current_listings
  FROM public.properties
  WHERE owner_id = NEW.owner_id AND status != 'archived';

  -- Enforce limit
  IF v_current_listings >= v_max_listings THEN
    RAISE EXCEPTION 'Listing limit reached for your current plan. Please upgrade to post more properties.';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to check limit before insert
DROP TRIGGER IF EXISTS tr_check_listing_limit ON public.properties;
CREATE TRIGGER tr_check_listing_limit
BEFORE INSERT ON public.properties
FOR EACH ROW
EXECUTE FUNCTION public.check_listing_limit();
