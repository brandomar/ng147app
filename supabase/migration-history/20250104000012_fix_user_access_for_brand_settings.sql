-- Fix user access for brand_settings RLS policies
-- Ensures the current user has undeniable role to access brand settings

-- ==============================================
-- ENSURE USER HAS UNDENIABLE ROLE
-- ==============================================

-- First, check if user_client_access table exists and has data
DO $$
DECLARE
    current_user_id UUID;
    user_exists BOOLEAN;
BEGIN
    -- Get current authenticated user
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found. This migration should be run after user authentication.';
        RETURN;
    END IF;
    
    -- Check if user exists in user_client_access
    SELECT EXISTS(
        SELECT 1 FROM user_client_access 
        WHERE user_id = current_user_id
    ) INTO user_exists;
    
    -- If user doesn't exist, create undeniable role for them
    IF NOT user_exists THEN
        INSERT INTO user_client_access (user_id, client_id, role, granted_by, created_at, updated_at)
        VALUES (
            current_user_id,
            NULL,  -- NULL for global undeniable access
            'undeniable',
            current_user_id,
            NOW(),
            NOW()
        );
        
        RAISE NOTICE 'Created undeniable role for user: %', current_user_id;
    ELSE
        -- Update existing user to undeniable role if they don't have it
        UPDATE user_client_access 
        SET 
            role = 'undeniable',
            client_id = NULL,  -- Ensure global access
            updated_at = NOW()
        WHERE user_id = current_user_id;
        
        RAISE NOTICE 'Updated user to undeniable role: %', current_user_id;
    END IF;
    
    RAISE NOTICE 'User access fixed for brand_settings access';
END $$;

-- ==============================================
-- VERIFY BRAND_SETTINGS RLS POLICIES
-- ==============================================

-- Ensure brand_settings table has proper RLS policies
DO $$
BEGIN
    -- Check if brand_settings table exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'brand_settings') THEN
        RAISE NOTICE 'brand_settings table does not exist. Please run the brand_settings migration first.';
        RETURN;
    END IF;
    
    -- Check if RLS is enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class 
        WHERE relname = 'brand_settings' 
        AND relrowsecurity = true
    ) THEN
        ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;
        RAISE NOTICE 'Enabled RLS on brand_settings table';
    END IF;
    
    -- Check if policies exist, if not create them
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Only undeniable users can view brand settings'
    ) THEN
        CREATE POLICY "Only undeniable users can view brand settings" ON brand_settings
        FOR SELECT USING (
            EXISTS (
                SELECT 1 FROM user_client_access uca
                WHERE uca.user_id = auth.uid() 
                AND uca.role = 'undeniable'
            )
        );
        RAISE NOTICE 'Created SELECT policy for brand_settings';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Only undeniable users can update brand settings'
    ) THEN
        CREATE POLICY "Only undeniable users can update brand settings" ON brand_settings
        FOR UPDATE USING (
            EXISTS (
                SELECT 1 FROM user_client_access uca
                WHERE uca.user_id = auth.uid() 
                AND uca.role = 'undeniable'
            )
        );
        RAISE NOTICE 'Created UPDATE policy for brand_settings';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'brand_settings' 
        AND policyname = 'Only undeniable users can insert brand settings'
    ) THEN
        CREATE POLICY "Only undeniable users can insert brand settings" ON brand_settings
        FOR INSERT WITH CHECK (
            EXISTS (
                SELECT 1 FROM user_client_access uca
                WHERE uca.user_id = auth.uid() 
                AND uca.role = 'undeniable'
            )
        );
        RAISE NOTICE 'Created INSERT policy for brand_settings';
    END IF;
    
    RAISE NOTICE 'Brand settings RLS policies verified and created if needed';
END $$;

-- ==============================================
-- CREATE DEFAULT BRAND SETTINGS IF NONE EXISTS
-- ==============================================

-- Insert default brand settings if none exist
INSERT INTO brand_settings (
    application_name,
    tagline,
    copyright_text,
    primary_color,
    secondary_color,
    accent_color,
    background_color,
    text_color,
    ui
) VALUES (
    'Dashboard',
    'Your Business Intelligence Platform',
    '© 2024 Dashboard. All rights reserved.',
    '#7B61FF',
    '#00FFB2',
    '#F3C969',
    '#0F0F0F',
    '#FFFFFF',
    '{
        "dashboardTitle": "Dashboard",
        "loginTitle": "Welcome to Dashboard",
        "welcomeMessage": "Welcome to your dashboard",
        "footerText": "© 2024 Dashboard. All rights reserved."
    }'::jsonb
) ON CONFLICT DO NOTHING;

-- ==============================================
-- VERIFICATION
-- ==============================================

-- Verify the fix worked
DO $$
DECLARE
    current_user_id UUID;
    has_access BOOLEAN;
BEGIN
    current_user_id := auth.uid();
    
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No authenticated user found. Please log in and try again.';
        RETURN;
    END IF;
    
    -- Check if user has undeniable role
    SELECT EXISTS(
        SELECT 1 FROM user_client_access 
        WHERE user_id = current_user_id 
        AND role = 'undeniable'
    ) INTO has_access;
    
    IF has_access THEN
        RAISE NOTICE '✅ User has undeniable role - brand settings access should work';
    ELSE
        RAISE NOTICE '❌ User does not have undeniable role - brand settings access will fail';
    END IF;
    
    -- Check if brand_settings table has data
    IF EXISTS (SELECT 1 FROM brand_settings LIMIT 1) THEN
        RAISE NOTICE '✅ Brand settings table has data';
    ELSE
        RAISE NOTICE '⚠️  Brand settings table is empty';
    END IF;
END $$;
