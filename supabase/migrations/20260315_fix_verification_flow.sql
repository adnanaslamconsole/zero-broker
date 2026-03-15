-- Create kyc-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
SELECT 'kyc-documents', 'kyc-documents', false
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'kyc-documents'
);

-- Delete existing policies to avoid duplicates
DROP POLICY IF EXISTS "Give users access to their own folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload kyc documents" ON storage.objects;

-- Create storage policies for kyc-documents
CREATE POLICY "Give users access to their own folder" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload kyc documents" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'kyc-documents' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Create a function to auto-verify KYC after some time (for demo/testing)
CREATE OR REPLACE FUNCTION public.auto_verify_kyc()
RETURNS trigger AS $$
BEGIN
    -- Only auto-verify for specific test emails or after 10 seconds (simulated)
    -- In a real app, this would be an admin action
    IF (SELECT email FROM auth.users WHERE id = NEW.id) LIKE '%@zerobroker.in' OR 
       (SELECT email FROM auth.users WHERE id = NEW.id) LIKE '%@demo.com' THEN
        UPDATE public.profiles 
        SET kyc_status = 'verified', trust_score = 100
        WHERE id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to simulate verification process
DROP TRIGGER IF EXISTS on_kyc_pending ON public.profiles;
-- CREATE TRIGGER on_kyc_pending
-- AFTER UPDATE OF kyc_status ON public.profiles
-- FOR EACH ROW
-- WHEN (NEW.kyc_status = 'pending')
-- EXECUTE FUNCTION public.auto_verify_kyc();
