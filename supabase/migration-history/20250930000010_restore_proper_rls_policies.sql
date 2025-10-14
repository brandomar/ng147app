-- Restore Proper RLS Policies
-- Creates non-recursive policies for users and user_client_access tables

-- ==============================================
-- USERS TABLE RLS POLICIES
-- ==============================================

-- Enable RLS on users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can only access their own record
CREATE POLICY "users_own_record_only" ON users
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- ==============================================
-- USER_CLIENT_ACCESS TABLE RLS POLICIES
-- ==============================================

-- Enable RLS on user_client_access table
ALTER TABLE user_client_access ENABLE ROW LEVEL SECURITY;

-- Simple policy: users can only access their own client access records
CREATE POLICY "user_client_access_own_records_only" ON user_client_access
    FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
