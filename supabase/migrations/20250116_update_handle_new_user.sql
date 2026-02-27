-- Update handle_new_user to include primary_role
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, mobile, name, primary_role, roles)
  VALUES (
    new.id,
    new.email,
    new.phone,
    new.raw_user_meta_data->>'name',
    COALESCE(new.raw_user_meta_data->>'role', 'tenant'),
    ARRAY[COALESCE(new.raw_user_meta_data->>'role', 'tenant')]
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
