-- Delete all properties associated with the main demo user ID
-- This resolves the issue where the paid demo user sees 53 / 10 listings
DELETE FROM public.properties 
WHERE owner_id = '00000000-0000-0000-0000-000000000000';

-- Optional: Reset any other stats associated with this user if needed
-- DELETE FROM public.service_bookings WHERE user_id = '00000000-0000-0000-0000-000000000000';
