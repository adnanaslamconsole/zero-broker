-- RPC to update trust score safely
CREATE OR REPLACE FUNCTION public.update_trust_score(user_id UUID, points INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.profiles
    SET trust_score = GREATEST(0, LEAST(100, trust_score + points))
    WHERE id = user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
