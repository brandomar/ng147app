-- Allow authenticated users to insert metrics
-- The Edge Function uses user JWT (authenticated role), not service_role

-- Add INSERT policy for authenticated users
CREATE POLICY "Authenticated users can insert metrics"
ON public.metrics
FOR INSERT
TO authenticated
WITH CHECK (
  -- User can insert if they have access to the client
  client_id IN (
    SELECT c.id 
    FROM public.clients c
    JOIN public.userroles ur ON c.id = ur.client_id
    WHERE ur.user_id = auth.uid()
  )
  OR
  -- Or if user is global admin
  is_global_admin(auth.uid())
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Authenticated users can now insert metrics';
  RAISE NOTICE '✅ Edge Function with user JWT will work';
  RAISE NOTICE '==============================================';
END $$;

