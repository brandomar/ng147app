-- Allow authenticated users to update metrics
-- Required for UPSERT operations in Edge Function

-- Add UPDATE policy for authenticated users
CREATE POLICY "Authenticated users can update metrics"
ON public.metrics
FOR UPDATE
TO authenticated
USING (
  -- User can update if they have access to the client
  client_id IN (
    SELECT c.id 
    FROM public.clients c
    JOIN public.userroles ur ON c.id = ur.client_id
    WHERE ur.user_id = auth.uid()
  )
  OR
  -- Or if user is global admin
  is_global_admin(auth.uid())
)
WITH CHECK (
  -- Same check for the updated row
  client_id IN (
    SELECT c.id 
    FROM public.clients c
    JOIN public.userroles ur ON c.id = ur.client_id
    WHERE ur.user_id = auth.uid()
  )
  OR
  is_global_admin(auth.uid())
);

-- Verification
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE '✅ Authenticated users can now UPDATE metrics';
  RAISE NOTICE '✅ UPSERT operations will now work properly';
  RAISE NOTICE '✅ Edge Function has full CRUD via user JWT';
  RAISE NOTICE '==============================================';
END $$;

