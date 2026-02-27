-- Re-insert plans in case they are missing (use ON CONFLICT to avoid dupes)
INSERT INTO pricing_plans (code, name, description, price_monthly, is_recommended, max_listings, highlight_listings, priority_support)
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
