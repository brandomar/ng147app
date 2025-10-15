

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;


COMMENT ON SCHEMA "public" IS 'standard public schema';



CREATE EXTENSION IF NOT EXISTS "pg_graphql" WITH SCHEMA "graphql";






CREATE EXTENSION IF NOT EXISTS "pg_stat_statements" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "pgcrypto" WITH SCHEMA "extensions";






CREATE EXTENSION IF NOT EXISTS "supabase_vault" WITH SCHEMA "vault";






CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA "extensions";






CREATE OR REPLACE FUNCTION "public"."accept_invitation"("p_invitation_token" "text", "p_user_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    invitation_record RECORD;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record
    FROM invitations
    WHERE invitation_token = p_invitation_token
    AND is_used = FALSE
    AND expires_at > NOW();
    
    -- Check if invitation exists and is valid
    IF NOT FOUND THEN
        RETURN FALSE;
    END IF;
    
    -- Mark invitation as used
    UPDATE invitations 
    SET is_used = TRUE, used_at = NOW()
    WHERE invitation_token = p_invitation_token;
    
    -- Assign user role based on invitation
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
    VALUES (p_user_id, invitation_record.client_id, invitation_record.role, invitation_record.invited_by, invitation_record.invited_by_email, NOW(), NOW())
    ON CONFLICT (user_id, client_id) DO NOTHING;
    
    RETURN TRUE;
END;
$$;


ALTER FUNCTION "public"."accept_invitation"("p_invitation_token" "text", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."add_data_source_to_tab"("p_client_id" "uuid", "p_tab_id" "text", "p_data_source_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tabs JSONB;
    v_updated_tabs JSONB;
BEGIN
    -- Get current tabs
    SELECT tabs INTO v_tabs FROM clients WHERE id = p_client_id;
    
    -- Update the specific tab with data source reference
    v_updated_tabs := jsonb_set(
        v_tabs,
        ARRAY[p_tab_id, 'data_source_id'],
        to_jsonb(p_data_source_id::TEXT)
    );
    
    -- Update the clients table
    UPDATE clients 
    SET tabs = v_updated_tabs 
    WHERE id = p_client_id;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."add_data_source_to_tab"("p_client_id" "uuid", "p_tab_id" "text", "p_data_source_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_all_unowned_clients"() RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    assigned_count INTEGER := 0;
    client_record RECORD;
BEGIN
    FOR client_record IN 
        SELECT c.id 
        FROM clients c 
        WHERE c.is_active = TRUE
        AND NOT EXISTS (
            SELECT 1 FROM user_access_control uac 
            WHERE uac.client_id = c.id 
            AND uac.role = 'client'
        )
    LOOP
        INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
        VALUES (auth.uid(), client_record.id, 'client', auth.uid(), NOW(), NOW())
        ON CONFLICT (user_id, client_id) DO NOTHING;
        
        assigned_count := assigned_count + 1;
    END LOOP;
    
    RETURN assigned_count;
END;
$$;


ALTER FUNCTION "public"."assign_all_unowned_clients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_client_ownership"("p_client_id" "uuid", "p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, p_client_id, 'client', auth.uid(), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = 'client',
        granted_by = auth.uid(),
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."assign_client_ownership"("p_client_id" "uuid", "p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_default_client"("p_user_id" "uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Only assign if user has no existing client assignments
    IF NOT EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id IS NOT NULL
    ) THEN
        INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
        VALUES (p_user_id, '00000000-0000-0000-0000-000000000000', 'client', p_user_id, NOW(), NOW())
        ON CONFLICT (user_id, client_id) DO NOTHING;
    END IF;
END;
$$;


ALTER FUNCTION "public"."assign_default_client"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_retroactive_client_access"() RETURNS TABLE("user_id" "uuid", "user_email" "text", "user_role" "text", "clients_assigned" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_record RECORD;
    client_record RECORD;
    access_count INTEGER;
BEGIN
    -- Get all users with undeniable or staff roles
    FOR user_record IN 
        SELECT u.user_id, u.email, u.global_role
        FROM users u
        WHERE u.global_role IN ('undeniable', 'staff')
    LOOP
        access_count := 0;
        
        -- Get all clients
        FOR client_record IN 
            SELECT c.id, c.name
            FROM clients c
        LOOP
            -- Check if access already exists
            IF NOT EXISTS (
                SELECT 1 FROM user_client_access uca 
                WHERE uca.user_id = user_record.user_id 
                AND uca.client_id = client_record.id
            ) THEN
                -- Create access record
                INSERT INTO user_client_access (
                    user_id, 
                    client_id, 
                    role, 
                    granted_by_email,
                    created_at,
                    updated_at
                ) VALUES (
                    user_record.user_id,
                    client_record.id,
                    CASE 
                        WHEN user_record.global_role = 'undeniable' THEN 'staff'
                        ELSE user_record.global_role
                    END,
                    'system@retroactive-assignment',
                    NOW(),
                    NOW()
                );
                
                access_count := access_count + 1;
            END IF;
        END LOOP;
        
        -- Return the result for this user
        user_id := user_record.user_id;
        user_email := user_record.email;
        user_role := user_record.global_role;
        clients_assigned := access_count;
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."assign_retroactive_client_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role_name" "text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, NULL, p_role_name, auth.uid(), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."calculate_conversion_rates"("p_user_id" "uuid", "p_client_id" "uuid", "p_date" "date") RETURNS TABLE("conversion_type" "text", "numerator_metric" "text", "denominator_metric" "text", "rate" numeric)
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  WITH metrics_data AS (
    SELECT 
      metric_name,
      value,
      category
    FROM metrics
    WHERE user_id = p_user_id
      AND client_id = p_client_id
      AND date = p_date
      AND metric_type = 'actual'
  )
  SELECT 
    'Opt-in Rate' as conversion_type,
    'Leads' as numerator_metric,
    'Clicks' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Clicks') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Leads') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Clicks'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Show Rate' as conversion_type,
    'Shows' as numerator_metric,
    'Calls Booked' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Calls Booked') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Calls Booked'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Offer Rate' as conversion_type,
    'Offers' as numerator_metric,
    'Shows' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Shows') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Offers') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows'), 4
      )
      ELSE 0
    END as rate
  UNION ALL
  SELECT 
    'Close Rate' as conversion_type,
    'Closes' as numerator_metric,
    'Shows' as denominator_metric,
    CASE 
      WHEN (SELECT value FROM metrics_data WHERE metric_name = 'Shows') > 0 
      THEN ROUND(
        (SELECT value FROM metrics_data WHERE metric_name = 'Closes') / 
        (SELECT value FROM metrics_data WHERE metric_name = 'Shows'), 4
      )
      ELSE 0
    END as rate;
END;
$$;


ALTER FUNCTION "public"."calculate_conversion_rates"("p_user_id" "uuid", "p_client_id" "uuid", "p_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_client"("p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Check if user has undeniable role (can access all)
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Check if user has specific client access
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND client_id = p_client_id
    ) THEN
        RETURN TRUE;
    END IF;
    
    RETURN FALSE;
END;
$$;


ALTER FUNCTION "public"."can_access_client"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."can_access_client"("p_user_id" "uuid", "p_client_id" "uuid") RETURNS boolean
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Undeniable users can access everything
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Staff users can access any client
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND role = 'staff'
        AND client_id IS NULL
    ) THEN
        RETURN TRUE;
    END IF;
    
    -- Client users can only access their assigned clients
    RETURN EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = p_user_id 
        AND client_id = p_client_id
    );
END;
$$;


ALTER FUNCTION "public"."can_access_client"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."check_metric_usage"("p_user_id" "uuid", "p_metric_name" character varying) RETURNS TABLE("usage_count" integer, "last_used" timestamp with time zone, "is_safe_to_delete" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    count_result INTEGER;
    last_used_result TIMESTAMPTZ;
BEGIN
    SELECT COUNT(*), MAX(updated_at) 
    INTO count_result, last_used_result
    FROM metrics 
    WHERE user_id = p_user_id AND metric_name = p_metric_name;
    
    RETURN QUERY
    SELECT 
        count_result as usage_count,
        last_used_result as last_used,
        (count_result = 0 OR last_used_result < NOW() - INTERVAL '30 days') as is_safe_to_delete;
END;
$$;


ALTER FUNCTION "public"."check_metric_usage"("p_user_id" "uuid", "p_metric_name" character varying) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."cleanup_old_metric_entries"("p_user_id" "uuid", "p_days_old" integer DEFAULT 90) RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics 
    WHERE user_id = p_user_id 
    AND created_at < NOW() - (p_days_old || ' days')::INTERVAL
    AND is_calculated = TRUE; -- Only delete calculated metrics, keep raw data
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."cleanup_old_metric_entries"("p_user_id" "uuid", "p_days_old" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_google_sheets_data_sources"("p_client_id" "uuid", "p_base_name" "text", "p_spreadsheet_id" "text", "p_selected_tabs" "jsonb") RETURNS TABLE("data_source_id" "uuid", "data_source_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tab JSONB;
    v_data_source_id UUID;
    v_data_source_name TEXT;
    v_display_order INTEGER := 0;
BEGIN
    -- Loop through selected tabs
    FOR v_tab IN SELECT * FROM jsonb_array_elements(p_selected_tabs)
    LOOP
        -- Generate unique data source name
        v_data_source_name := p_base_name || ' - ' || (v_tab->>'name');
        
        -- Create data source
        INSERT INTO data_sources (
            client_id,
            name,
            source_type,
            source_config,
            is_active,
            display_order
        ) VALUES (
            p_client_id,
            v_data_source_name,
            'google_sheets',
            jsonb_build_object(
                'spreadsheet_id', p_spreadsheet_id,
                'sheet_name', v_tab->>'name',
                'sheet_gid', v_tab->>'gid',
                'range', 'A:AZ',
                'auto_sync', true,
                'sync_frequency', 'daily'
            ),
            true,
            v_display_order
        ) RETURNING id INTO v_data_source_id;
        
        -- Return the created data source info
        RETURN QUERY SELECT v_data_source_id, v_data_source_name;
        
        -- Increment display order
        v_display_order := v_display_order + 1;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."create_google_sheets_data_sources"("p_client_id" "uuid", "p_base_name" "text", "p_spreadsheet_id" "text", "p_selected_tabs" "jsonb") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."create_invitation"("p_email" "text", "p_client_id" "uuid", "p_role" "text", "p_invited_by_email" "text", "p_expires_in_hours" integer DEFAULT 168) RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    invitation_token TEXT;
    expires_at TIMESTAMPTZ;
BEGIN
    -- Generate unique invitation token
    invitation_token := encode(gen_random_bytes(32), 'hex');
    
    -- Calculate expiration time
    expires_at := NOW() + (p_expires_in_hours || ' hours')::INTERVAL;
    
    -- Insert invitation
    INSERT INTO invitations (email, client_id, role, invited_by, invited_by_email, invitation_token, expires_at)
    VALUES (p_email, p_client_id, p_role, auth.uid(), p_invited_by_email, invitation_token, expires_at);
    
    RETURN invitation_token;
END;
$$;


ALTER FUNCTION "public"."create_invitation"("p_email" "text", "p_client_id" "uuid", "p_role" "text", "p_invited_by_email" "text", "p_expires_in_hours" integer) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."detect_duplicate_metrics"("p_user_id" "uuid") RETURNS TABLE("metric_name" character varying, "date" "date", "duplicate_count" integer)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.date,
        COUNT(*)::INTEGER as duplicate_count
    FROM metrics m
    WHERE m.user_id = p_user_id
    GROUP BY m.metric_name, m.date, m.client_id, m.category
    HAVING COUNT(*) > 1
    ORDER BY duplicate_count DESC;
END;
$$;


ALTER FUNCTION "public"."detect_duplicate_metrics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."discover_google_sheets_tabs"("p_spreadsheet_id" "text") RETURNS TABLE("tab_name" "text", "tab_gid" "text", "tab_url" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_response JSONB;
    v_sheets JSONB;
    v_sheet JSONB;
    v_spreadsheet_url TEXT;
BEGIN
    -- Construct the spreadsheet URL
    v_spreadsheet_url := 'https://docs.google.com/spreadsheets/d/' || p_spreadsheet_id || '/edit';
    
    -- Call the Edge Function to get real sheet data
    -- This requires the Edge Function to be deployed and accessible
    -- The Edge Function endpoint: /functions/v1/sync-client-tab
    -- With parameters: { "discover_sheets_only": true, "google_sheet_id": p_spreadsheet_id }
    
    -- For now, return empty result to avoid mock data
    -- The frontend should call the Edge Function directly instead of this database function
    RETURN;
    
    -- Future implementation will look like:
    -- SELECT 
    --     (v_sheet->>'name')::TEXT as tab_name,
    --     (v_sheet->>'gid')::TEXT as tab_gid,
    --     (v_spreadsheet_url || '#gid=' || (v_sheet->>'gid'))::TEXT as tab_url
    -- FROM jsonb_array_elements(v_sheets) as v_sheet;
END;
$$;


ALTER FUNCTION "public"."discover_google_sheets_tabs"("p_spreadsheet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_clients"() RETURNS TABLE("id" "uuid", "name" "text", "slug" "text", "company_name" "text", "logo_url" "text", "allowed_categories" "text"[], "client_type" "text", "data_source" "text", "google_sheets_url" "text", "google_sheets_tabs" "text"[], "owner_id" "uuid", "tabs" "jsonb", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
    current_user_id UUID;
BEGIN
    -- Get the current user's global role
    SELECT global_role INTO user_role
    FROM users 
    WHERE user_id = auth.uid();
    
    -- If user not found, default to client role
    user_role := COALESCE(user_role, 'client');
    current_user_id := auth.uid();
    
    -- Return clients based on role (removed is_active filter)
    IF user_role = 'undeniable' THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.allowed_categories,
            c.client_type,
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        ORDER BY c.name;
        
    ELSIF user_role = 'staff' THEN
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.allowed_categories,
            c.client_type,
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = current_user_id
        ORDER BY c.name;
        
    ELSE
        RETURN QUERY
        SELECT 
            c.id,
            c.name,
            c.slug,
            c.company_name,
            c.logo_url,
            c.allowed_categories,
            c.client_type,
            c.data_source,
            c.google_sheets_url,
            c.google_sheets_tabs,
            c.owner_id,
            c.tabs,
            c.created_at,
            c.updated_at
        FROM clients c
        INNER JOIN user_client_access uca ON c.id = uca.client_id
        WHERE uca.user_id = current_user_id
        ORDER BY c.name;
    END IF;
END;
$$;


ALTER FUNCTION "public"."get_accessible_clients"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_accessible_sheets"("p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "client_id" "uuid", "google_sheet_id" "text", "sheet_name" "text", "is_active" boolean, "total_metrics" integer, "total_configured_metrics" integer, "created_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.user_id,
        dm.client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        dm.is_active,
        dm.total_metrics,
        dm.total_configured_metrics,
        dm.created_at
    FROM discovered_metrics dm
    WHERE (p_client_id IS NULL OR dm.client_id = p_client_id)
    AND dm.is_active = TRUE
    ORDER BY dm.sheet_name;
END;
$$;


ALTER FUNCTION "public"."get_accessible_sheets"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_all_users_with_roles_and_access"() RETURNS TABLE("user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "global_role" "text", "client_access" "jsonb")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.global_role,
        COALESCE(
            jsonb_agg(
                jsonb_build_object(
                    'client_id', uca.client_id,
                    'client_name', c.name,
                    'role', uca.role
                ) 
                ORDER BY c.name
            ) FILTER (WHERE uca.client_id IS NOT NULL),
            '[]'::jsonb
        ) as client_access
    FROM users u
    LEFT JOIN user_client_access uca ON u.user_id = uca.user_id
    LEFT JOIN clients c ON uca.client_id = c.id
    GROUP BY u.user_id, u.email, u.first_name, u.last_name, u.global_role
    ORDER BY u.email;
END;
$$;


ALTER FUNCTION "public"."get_all_users_with_roles_and_access"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_available_sheets_for_user"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("sheet_name" "text", "tab_name" "text", "google_sheet_id" "text", "metrics_count" bigint, "latest_sync" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.sheet_name,
        m.tab_name,
        m.google_sheet_id,
        COUNT(DISTINCT m.metric_name) as metrics_count,
        MAX(m.created_at) as latest_sync
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.sheet_name, m.tab_name, m.google_sheet_id
    ORDER BY m.sheet_name, m.tab_name;
END;
$$;


ALTER FUNCTION "public"."get_available_sheets_for_user"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_client_tabs_with_sources"("p_client_id" "uuid") RETURNS TABLE("tab_id" "text", "tab_name" "text", "data_source_id" "uuid", "data_source_name" "text", "source_type" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    v_tabs JSONB;
    v_tab JSONB;
    v_data_source_id UUID;
BEGIN
    -- Get client tabs
    SELECT tabs INTO v_tabs FROM clients WHERE id = p_client_id;
    
    -- Process each tab
    FOR v_tab IN SELECT * FROM jsonb_array_elements(v_tabs)
    LOOP
        tab_id := v_tab->>'id';
        tab_name := v_tab->>'name';
        data_source_id := (v_tab->>'data_source_id')::UUID;
        source_type := v_tab->>'source_type';
        
        -- Get data source name if data_source_id exists
        IF data_source_id IS NOT NULL THEN
            SELECT name INTO data_source_name 
            FROM data_sources 
            WHERE id = data_source_id;
        ELSE
            data_source_name := NULL;
        END IF;
        
        RETURN NEXT;
    END LOOP;
END;
$$;


ALTER FUNCTION "public"."get_client_tabs_with_sources"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_configured_metrics"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "client_id" "uuid", "category" character varying, "metric_name" character varying, "value" numeric, "date" "date", "is_calculated" boolean, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.id,
        m.user_id,
        m.client_id,
        m.category,
        m.metric_name,
        m.value,
        m.date,
        m.is_calculated,
        m.created_at,
        m.updated_at
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    ORDER BY m.date DESC, m.category, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_configured_metrics"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_connection_stats"() RETURNS TABLE("total_users" integer, "active_clients" integer, "total_metrics" integer, "recent_syncs" integer, "system_health" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_count INTEGER;
    client_count INTEGER;
    metric_count INTEGER;
    sync_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM auth.users;
    SELECT COUNT(*) INTO client_count FROM clients WHERE is_active = TRUE;
    SELECT COUNT(*) INTO metric_count FROM metrics;
    SELECT COUNT(*) INTO sync_count FROM sync_status WHERE last_sync_at > NOW() - INTERVAL '24 hours';
    
    RETURN QUERY
    SELECT 
        user_count as total_users,
        client_count as active_clients,
        metric_count as total_metrics,
        sync_count as recent_syncs,
        'healthy'::TEXT as system_health;
END;
$$;


ALTER FUNCTION "public"."get_connection_stats"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_data_source_breakdown"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("data_source_type" character varying, "sheet_name" "text", "tab_name" "text", "data_source_id" character varying, "metrics_count" bigint, "categories" "text"[], "latest_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.data_source_type,
        m.sheet_name,
        m.tab_name,
        m.data_source_id,
        COUNT(*) as metrics_count,
        ARRAY_AGG(DISTINCT m.category) as categories,
        MAX(m.date) as latest_date
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.data_source_type, m.sheet_name, m.tab_name, m.data_source_id
    ORDER BY m.data_source_type, m.sheet_name, m.tab_name;
END;
$$;


ALTER FUNCTION "public"."get_data_source_breakdown"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_data_source_summary"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("data_source_type" character varying, "data_source_count" bigint, "total_metrics" bigint, "latest_date" "date", "categories" "text"[])
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.data_source_type,
        COUNT(DISTINCT m.data_source_id) as data_source_count,
        COUNT(*) as total_metrics,
        MAX(m.date) as latest_date,
        ARRAY_AGG(DISTINCT m.category) as categories
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    GROUP BY m.data_source_type
    ORDER BY m.data_source_type;
END;
$$;


ALTER FUNCTION "public"."get_data_source_summary"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_hierarchical_data_from_metrics"("p_user_id" "uuid") RETURNS TABLE("client_id" "uuid", "client_name" "text", "sheet_name" "text", "tab_name" "text", "tab_gid" "text", "google_sheet_id" "text", "metrics_count" bigint, "latest_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id as client_id,
        c.name as client_name,
        m.sheet_name,
        m.tab_name,
        m.tab_gid,
        m.google_sheet_id,
        COUNT(DISTINCT m.metric_name) as metrics_count,
        MAX(m.date) as latest_date
    FROM clients c
    INNER JOIN metrics m ON c.id = m.client_id
    WHERE c.user_id = p_user_id
    GROUP BY c.id, c.name, m.sheet_name, m.tab_name, m.tab_gid, m.google_sheet_id
    ORDER BY c.name, m.sheet_name, m.tab_name;
END;
$$;


ALTER FUNCTION "public"."get_hierarchical_data_from_metrics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metric_configurations"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_sheet_name" "text" DEFAULT NULL::"text") RETURNS TABLE("metric_name" "text", "category" "text", "sheet_name" "text", "tab_name" "text", "total_entries" bigint, "latest_date" "date", "avg_value" numeric)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.category,
        m.sheet_name,
        m.tab_name,
        COUNT(*) as total_entries,
        MAX(m.date) as latest_date,
        AVG(m.value) as avg_value
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_sheet_name IS NULL OR m.sheet_name = p_sheet_name)
    GROUP BY m.metric_name, m.category, m.sheet_name, m.tab_name
    ORDER BY m.sheet_name, m.tab_name, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_metric_configurations"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metrics_by_category"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_category" character varying DEFAULT NULL::character varying, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" character varying, "value" numeric, "date" "date", "is_calculated" boolean)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.value,
        m.date,
        m.is_calculated
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_category IS NULL OR m.category = p_category)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_metrics_by_category"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metrics_by_data_source"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_data_source_type" character varying DEFAULT NULL::character varying, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" "text", "value" numeric, "date" "date", "category" "text", "sheet_name" "text", "tab_name" "text", "data_source_type" character varying, "data_source_id" character varying)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.value,
        m.date,
        m.category,
        m.sheet_name,
        m.tab_name,
        m.data_source_type,
        m.data_source_id
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_data_source_type IS NULL OR m.data_source_type = p_data_source_type)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_metrics_by_data_source"("p_user_id" "uuid", "p_client_id" "uuid", "p_data_source_type" character varying, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metrics_by_sheet_tab"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_sheet_name" "text" DEFAULT NULL::"text", "p_tab_name" "text" DEFAULT NULL::"text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" "text", "value" numeric, "date" "date", "category" "text", "sheet_name" "text", "tab_name" "text", "google_sheet_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.value,
        m.date,
        m.category,
        m.sheet_name,
        m.tab_name,
        m.google_sheet_id
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_sheet_name IS NULL OR m.sheet_name = p_sheet_name)
    AND (p_tab_name IS NULL OR m.tab_name = p_tab_name)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_metrics_by_sheet_tab"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text", "p_tab_name" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_metrics_with_targets"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" "text", "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" "text", "actual_value" numeric, "target_value" numeric, "percentage_to_target" numeric, "date" "date", "metric_type" "text")
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  RETURN QUERY
  SELECT 
    m.metric_name,
    m.value as actual_value,
    m.target_value,
    CASE 
      WHEN m.target_value > 0 THEN ROUND((m.value / m.target_value) * 100, 2)
      ELSE NULL
    END as percentage_to_target,
    m.date,
    m.metric_type
  FROM metrics m
  WHERE m.user_id = p_user_id
    AND m.client_id = p_client_id
    AND m.category = p_category
    AND m.metric_type = 'actual'
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
  ORDER BY m.date DESC, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_metrics_with_targets"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" "text", "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_discovered_metrics"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "client_id" "uuid", "google_sheet_id" "text", "sheet_name" "text", "metric_configs" "jsonb", "total_configured_metrics" integer, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.user_id,
        dm.client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        dm.metric_configs,
        dm.total_configured_metrics,
        dm.created_at,
        dm.updated_at
    FROM discovered_metrics dm
    JOIN clients c ON dm.client_id = c.id
    WHERE dm.user_id = p_user_id
    AND c.client_type = 'client'  -- Staff manages client dashboards, not undeniable
    ORDER BY dm.created_at DESC;
    
    RAISE NOTICE 'get_staff_discovered_metrics - filters discovered metrics by client type only';
END;
$$;


ALTER FUNCTION "public"."get_staff_discovered_metrics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_staff_sheet_info"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "client_id" "uuid", "google_sheet_id" "text", "sheet_name" "text", "metrics" "jsonb", "metric_configs" "jsonb", "total_metrics" integer, "total_configured_metrics" integer, "sheet_names" "text"[], "allowed_categories" "text"[], "is_active" boolean, "discovered_at" timestamp with time zone, "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.user_id,
        dm.client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        dm.metrics,
        dm.metric_configs,
        dm.total_metrics,
        dm.total_configured_metrics,
        dm.sheet_names,
        dm.allowed_categories,
        dm.is_active,
        dm.discovered_at,
        dm.created_at,
        dm.updated_at
    FROM discovered_metrics dm
    WHERE dm.user_id = p_user_id
    AND dm.is_active = TRUE
    ORDER BY dm.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_staff_sheet_info"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_undeniable_dashboard_metrics"("p_user_id" "uuid", "p_category" character varying DEFAULT NULL::character varying, "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" character varying, "value" numeric, "date" "date", "is_calculated" boolean, "client_id" "uuid", "client_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        m.value,
        m.date,
        m.is_calculated,
        m.client_id,
        c.name as client_name
    FROM metrics m
    INNER JOIN clients c ON m.client_id = c.id
    WHERE m.user_id = p_user_id
    AND c.client_type = 'undeniable'  -- Only undeniable clients
    AND (p_category IS NULL OR m.category = p_category)
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    ORDER BY m.date DESC, m.metric_name;
END;
$$;


ALTER FUNCTION "public"."get_undeniable_dashboard_metrics"("p_user_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_undeniable_discovered_metrics"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "client_id" "uuid", "google_sheet_id" "text", "sheet_name" "text", "metric_configs" "jsonb", "total_configured_metrics" integer, "last_sync_at" timestamp with time zone, "sync_status" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        dm.id,
        dm.user_id,
        dm.client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        dm.metric_configs,
        dm.total_configured_metrics,
        dm.last_sync_at,
        dm.sync_status,
        dm.created_at,
        dm.updated_at
    FROM discovered_metrics dm
    INNER JOIN clients c ON dm.client_id = c.id
    WHERE dm.user_id = p_user_id
    AND c.client_type = 'undeniable'
    ORDER BY dm.created_at DESC;
END;
$$;


ALTER FUNCTION "public"."get_undeniable_discovered_metrics"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text") RETURNS TABLE("sync_status" "text", "last_sync_at" timestamp with time zone, "last_successful_sync_at" timestamp with time zone, "sync_error_message" "text", "total_sync_count" integer, "successful_sync_count" integer, "sheet_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        ss.sync_status,
        ss.last_sync_at,
        ss.last_successful_sync_at,
        ss.sync_error_message,
        ss.total_sync_count,
        ss.successful_sync_count,
        ss.sheet_name
    FROM sync_status ss
    INNER JOIN clients c ON ss.client_id = c.id
    WHERE ss.user_id = p_user_id
    AND ss.google_sheet_id = p_google_sheet_id
    AND c.client_type = 'undeniable'  -- Only undeniable clients
    ORDER BY ss.created_at DESC
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_unified_metrics"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_include_data_sources" "text"[] DEFAULT NULL::"text"[], "p_start_date" "date" DEFAULT NULL::"date", "p_end_date" "date" DEFAULT NULL::"date") RETURNS TABLE("metric_name" "text", "total_value" numeric, "avg_value" numeric, "count" bigint, "category" "text", "data_sources" "text"[], "latest_date" "date")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        m.metric_name,
        SUM(m.value) as total_value,
        AVG(m.value) as avg_value,
        COUNT(*) as count,
        m.category,
        ARRAY_AGG(DISTINCT m.data_source_type) as data_sources,
        MAX(m.date) as latest_date
    FROM metrics m
    WHERE m.user_id = p_user_id
    AND (p_client_id IS NULL OR m.client_id = p_client_id)
    AND (p_include_data_sources IS NULL OR m.data_source_type = ANY(p_include_data_sources))
    AND (p_start_date IS NULL OR m.date >= p_start_date)
    AND (p_end_date IS NULL OR m.date <= p_end_date)
    GROUP BY m.metric_name, m.category
    ORDER BY total_value DESC;
END;
$$;


ALTER FUNCTION "public"."get_unified_metrics"("p_user_id" "uuid", "p_client_id" "uuid", "p_include_data_sources" "text"[], "p_start_date" "date", "p_end_date" "date") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_access"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("user_id" "uuid", "client_id" "uuid", "access_level" "text", "role" "text", "client_name" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        uac.user_id,
        uac.client_id,
        uac.role as access_level,
        uac.role,
        c.name as client_name
    FROM user_access_control uac
    LEFT JOIN clients c ON c.id = uac.client_id
    WHERE uac.user_id = p_user_id
    AND (p_client_id IS NULL OR uac.client_id = p_client_id)
    ORDER BY c.name;
END;
$$;


ALTER FUNCTION "public"."get_user_access"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_access_level"("p_user_id" "uuid", "p_client_id" "uuid" DEFAULT NULL::"uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
    client_role TEXT;
BEGIN
    -- Get user's global role
    SELECT role INTO user_role
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id IS NULL
    LIMIT 1;
    
    -- If undeniable, always admin
    IF user_role = 'undeniable' THEN
        RETURN 'admin';
    END IF;
    
    -- If no client specified, return based on global role
    IF p_client_id IS NULL THEN
        RETURN CASE 
            WHEN user_role = 'staff' THEN 'admin'
            WHEN user_role = 'client' THEN 'read'
            ELSE 'none'
        END;
    END IF;
    
    -- Check client-specific access
    SELECT role INTO client_role
    FROM user_access_control 
    WHERE user_id = p_user_id 
    AND client_id = p_client_id
    LIMIT 1;
    
    -- Convert role to access level
    RETURN CASE 
        WHEN client_role = 'client' THEN 'read'  -- Client role = read access
        WHEN user_role = 'staff' THEN 'write'       -- Staff can write to any client
        ELSE 'none'
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;


ALTER FUNCTION "public"."get_user_access_level"("p_user_id" "uuid", "p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_client_access_level"("p_client_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    user_role TEXT;
    client_role TEXT;
BEGIN
    -- Check for global undeniable role
    IF EXISTS (
        SELECT 1 FROM user_access_control 
        WHERE user_id = auth.uid() 
        AND role = 'undeniable'
        AND client_id IS NULL
    ) THEN
        RETURN 'admin';
    END IF;
    
    -- Get user's global role
    SELECT role INTO user_role
    FROM user_access_control 
    WHERE user_id = auth.uid() 
    AND client_id IS NULL
    LIMIT 1;
    
    -- Check client-specific access
    SELECT role INTO client_role
    FROM user_access_control 
    WHERE user_id = auth.uid() AND client_id = p_client_id
    LIMIT 1;
    
    -- Convert role to access level
    RETURN CASE 
        WHEN client_role = 'client' THEN 'read'  -- Client role = read access
        WHEN user_role = 'staff' THEN 'write'       -- Staff can write to any client
        ELSE 'none'
    END;
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'none';
END;
$$;


ALTER FUNCTION "public"."get_user_client_access_level"("p_client_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_profile"("p_user_id" "uuid") RETURNS TABLE("id" "uuid", "user_id" "uuid", "email" "text", "first_name" "text", "last_name" "text", "global_role" "text", "created_at" timestamp with time zone, "updated_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    RETURN QUERY
    SELECT 
        u.id,
        u.user_id,
        u.email,
        u.first_name,
        u.last_name,
        u.global_role,
        u.created_at,
        u.updated_at
    FROM users u
    WHERE u.user_id = p_user_id
    LIMIT 1;
END;
$$;


ALTER FUNCTION "public"."get_user_profile"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_role"("p_user_id" "uuid") RETURNS "text"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    result TEXT;
BEGIN
    SELECT global_role INTO result
    FROM users 
    WHERE user_id = p_user_id;
    
    RETURN COALESCE(result, 'client'); -- Default to client if not found
EXCEPTION
    WHEN OTHERS THEN
        RETURN 'client'; -- Default to client on error
END;
$$;


ALTER FUNCTION "public"."get_user_role"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."grant_user_access"("p_user_id" "uuid", "p_role" "text", "p_client_id" "uuid" DEFAULT NULL::"uuid", "p_granted_by" "uuid" DEFAULT NULL::"uuid") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, created_at, updated_at)
    VALUES (p_user_id, p_client_id, p_role, COALESCE(p_granted_by, auth.uid()), NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        updated_at = NOW();
END;
$$;


ALTER FUNCTION "public"."grant_user_access"("p_user_id" "uuid", "p_role" "text", "p_client_id" "uuid", "p_granted_by" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."migrate_metrics_to_discovered_metrics"() RETURNS "text"
    LANGUAGE "plpgsql"
    AS $$
DECLARE
    migration_count INTEGER := 0;
    sheet_record RECORD;
    metric_config JSONB;
    metric_values JSONB;
    total_migrated INTEGER := 0;
BEGIN
    -- Group metrics by user, client, and sheet
    FOR sheet_record IN 
        SELECT DISTINCT 
            m.user_id,
            m.client_id,
            COALESCE(m.sheet_name, 'Default Sheet') as sheet_name,
            COALESCE(m.tab_name, 'Default Tab') as tab_name,
            COALESCE(m.google_sheet_id, 'migrated-' || m.user_id) as google_sheet_id
        FROM metrics m
        WHERE m.user_id IS NOT NULL
        AND m.client_id IS NOT NULL
    LOOP
        -- Build metric configurations from unique metric names
        SELECT jsonb_agg(
            jsonb_build_object(
                'metric_name', metric_name,
                'is_enabled', true,
                'display_name', metric_name,
                'metric_type', 'number',
                'category', category
            )
        ) INTO metric_config
        FROM (
            SELECT DISTINCT metric_name, category
            FROM metrics m2
            WHERE m2.user_id = sheet_record.user_id
            AND m2.client_id = sheet_record.client_id
            AND COALESCE(m2.sheet_name, 'Default Sheet') = sheet_record.sheet_name
            AND COALESCE(m2.tab_name, 'Default Tab') = sheet_record.tab_name
        ) as unique_metrics;

        -- Build metric values from all data points
        SELECT jsonb_agg(
            jsonb_build_object(
                'date', date,
                'metric_name', metric_name,
                'value', value,
                'category', category
            )
        ) INTO metric_values
        FROM metrics m3
        WHERE m3.user_id = sheet_record.user_id
        AND m3.client_id = sheet_record.client_id
        AND COALESCE(m3.sheet_name, 'Default Sheet') = sheet_record.sheet_name
        AND COALESCE(m3.tab_name, 'Default Tab') = sheet_record.tab_name
        ORDER BY date DESC;

        -- Insert or update discovered_metrics record
        INSERT INTO discovered_metrics (
            user_id,
            client_id,
            google_sheet_id,
            sheet_name,
            tab_name,
            metric_configs,
            metric_values,
            total_configured_metrics,
            total_data_points,
            is_active,
            last_sync_at
        ) VALUES (
            sheet_record.user_id,
            sheet_record.client_id,
            sheet_record.google_sheet_id,
            sheet_record.sheet_name,
            sheet_record.tab_name,
            metric_config,
            metric_values,
            jsonb_array_length(metric_config),
            jsonb_array_length(metric_values),
            true,
            NOW()
        )
        ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name, tab_name)
        DO UPDATE SET
            metric_configs = EXCLUDED.metric_configs,
            metric_values = EXCLUDED.metric_values,
            total_configured_metrics = EXCLUDED.total_configured_metrics,
            total_data_points = EXCLUDED.total_data_points,
            last_sync_at = EXCLUDED.last_sync_at,
            updated_at = NOW();

        migration_count := migration_count + 1;
    END LOOP;

    -- Count total migrated records
    SELECT COUNT(*) INTO total_migrated FROM discovered_metrics WHERE last_sync_at IS NOT NULL;

    RETURN 'Migration completed: ' || migration_count || ' sheets processed, ' || total_migrated || ' total records in discovered_metrics';
END;
$$;


ALTER FUNCTION "public"."migrate_metrics_to_discovered_metrics"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."run_metric_maintenance"("p_user_id" "uuid", "p_cleanup_old_days" integer DEFAULT 90, "p_remove_duplicates" boolean DEFAULT true) RETURNS TABLE("operation" "text", "affected_rows" integer, "status" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    cleanup_count INTEGER;
    duplicate_count INTEGER;
BEGIN
    -- Cleanup old entries
    SELECT cleanup_old_metric_entries(p_user_id, p_cleanup_old_days) INTO cleanup_count;
    
    RETURN QUERY
    SELECT 'cleanup_old_entries'::TEXT, cleanup_count, 'completed'::TEXT;
    
    -- Remove duplicates if requested
    IF p_remove_duplicates THEN
        WITH duplicates AS (
            SELECT id FROM (
                SELECT id, 
                       ROW_NUMBER() OVER (
                           PARTITION BY user_id, client_id, date, category, metric_name 
                           ORDER BY created_at DESC
                       ) as rn
                FROM metrics 
                WHERE user_id = p_user_id
            ) t WHERE rn > 1
        )
        DELETE FROM metrics WHERE id IN (SELECT id FROM duplicates);
        
        GET DIAGNOSTICS duplicate_count = ROW_COUNT;
        
        RETURN QUERY
        SELECT 'remove_duplicates'::TEXT, duplicate_count, 'completed'::TEXT;
    END IF;
END;
$$;


ALTER FUNCTION "public"."run_metric_maintenance"("p_user_id" "uuid", "p_cleanup_old_days" integer, "p_remove_duplicates" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_delete_sheet_metrics"("p_user_id" "uuid", "p_sheet_name" "text") RETURNS integer
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM metrics 
    WHERE user_id = p_user_id 
    AND metric_name LIKE '%' || p_sheet_name || '%'
    AND updated_at < NOW() - INTERVAL '7 days';
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$;


ALTER FUNCTION "public"."safe_delete_sheet_metrics"("p_user_id" "uuid", "p_sheet_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."safe_grant_client_access"("p_client_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_granted_by_email" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert or update user access control
    INSERT INTO user_access_control (user_id, client_id, role, granted_by, granted_by_email, created_at, updated_at)
    VALUES (p_user_id, p_client_id, p_role, auth.uid(), p_granted_by_email, NOW(), NOW())
    ON CONFLICT (user_id, client_id)
    DO UPDATE SET
        role = EXCLUDED.role,
        granted_by = EXCLUDED.granted_by,
        granted_by_email = EXCLUDED.granted_by_email,
        updated_at = NOW();
        
    -- Log the access grant
    RAISE NOTICE 'Client access granted: user_id=%, client_id=%, role=%', p_user_id, p_client_id, p_role;
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to grant client access: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."safe_grant_client_access"("p_client_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_granted_by_email" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_brand_settings_updated_at"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_brand_settings_updated_at"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_client_sync_status"("p_client_id" "uuid", "p_sync_status" character varying, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO sync_status (user_id, client_id, google_sheet_id, sheet_name, sync_status, sync_error_message, last_sync_at, total_sync_count, updated_at)
    SELECT 
        auth.uid(),
        p_client_id,
        dm.google_sheet_id,
        dm.sheet_name,
        p_sync_status,
        p_error_message,
        NOW(),
        1,
        NOW()
    FROM discovered_metrics dm
    WHERE dm.client_id = p_client_id
    ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        sync_error_message = EXCLUDED.sync_error_message,
        last_sync_at = EXCLUDED.last_sync_at,
        total_sync_count = sync_status.total_sync_count + 1,
        updated_at = NOW();
        
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = successful_sync_count + 1
        WHERE user_id = auth.uid() AND client_id = p_client_id;
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_client_sync_status"("p_client_id" "uuid", "p_sync_status" character varying, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_notifications_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_notifications_updated_at_column"() OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_error_message" "text" DEFAULT NULL::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    INSERT INTO sync_status (user_id, client_id, google_sheet_id, sheet_name, sync_status, sync_error_message, last_sync_at, total_sync_count, updated_at)
    VALUES (p_user_id, NULL, p_google_sheet_id, 'staff', p_sync_status, p_error_message, NOW(), 1, NOW())
    ON CONFLICT (user_id, client_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        sync_error_message = EXCLUDED.sync_error_message,
        last_sync_at = EXCLUDED.last_sync_at,
        total_sync_count = sync_status.total_sync_count + 1,
        updated_at = NOW();
        
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = successful_sync_count + 1
        WHERE user_id = p_user_id AND google_sheet_id = p_google_sheet_id AND sheet_name = 'staff';
    END IF;
END;
$$;


ALTER FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_error_message" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sheet_name" "text" DEFAULT 'staff'::"text") RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert or update sync status for staff
    INSERT INTO sync_status (
        user_id,
        google_sheet_id,
        sheet_name,
        sync_status,
        last_sync_at,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_google_sheet_id,
        p_sheet_name,
        p_sync_status,
        COALESCE(p_last_sync_at, NOW()),
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        last_sync_at = EXCLUDED.last_sync_at,
        updated_at = NOW();
        
    -- If sync is successful, update success counters
    IF p_sync_status = 'completed' THEN
        UPDATE sync_status 
        SET 
            last_successful_sync_at = NOW(),
            successful_sync_count = COALESCE(successful_sync_count, 0) + 1,
            total_sync_count = COALESCE(total_sync_count, 0) + 1
        WHERE user_id = p_user_id 
        AND google_sheet_id = p_google_sheet_id 
        AND sheet_name = p_sheet_name;
    END IF;
    
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the sync
        RAISE WARNING 'Failed to update staff sync status: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sheet_name" "text" DEFAULT 'undeniable'::"text", "p_last_successful_sync_at" timestamp with time zone DEFAULT NULL::timestamp with time zone, "p_sync_error_message" "text" DEFAULT NULL::"text", "p_increment_total" boolean DEFAULT true, "p_increment_successful" boolean DEFAULT false) RETURNS "void"
    LANGUAGE "plpgsql" SECURITY DEFINER
    AS $$
BEGIN
    -- Insert or update sync status for undeniable dashboard
    INSERT INTO sync_status (
        user_id,
        google_sheet_id,
        sheet_name,
        sync_status,
        last_sync_at,
        last_successful_sync_at,
        sync_error_message,
        total_sync_count,
        successful_sync_count,
        created_at,
        updated_at
    ) VALUES (
        p_user_id,
        p_google_sheet_id,
        p_sheet_name,
        p_sync_status,
        COALESCE(p_last_sync_at, NOW()),
        p_last_successful_sync_at,
        p_sync_error_message,
        CASE WHEN p_increment_total THEN 1 ELSE 0 END,
        CASE WHEN p_increment_successful THEN 1 ELSE 0 END,
        NOW(),
        NOW()
    )
    ON CONFLICT (user_id, google_sheet_id, sheet_name)
    DO UPDATE SET
        sync_status = EXCLUDED.sync_status,
        last_sync_at = EXCLUDED.last_sync_at,
        last_successful_sync_at = EXCLUDED.last_successful_sync_at,
        sync_error_message = EXCLUDED.sync_error_message,
        total_sync_count = sync_status.total_sync_count + CASE WHEN p_increment_total THEN 1 ELSE 0 END,
        successful_sync_count = sync_status.successful_sync_count + CASE WHEN p_increment_successful THEN 1 ELSE 0 END,
        updated_at = NOW();
        
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the sync
        RAISE WARNING 'Failed to update undeniable sync status: %', SQLERRM;
END;
$$;


ALTER FUNCTION "public"."update_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text", "p_last_successful_sync_at" timestamp with time zone, "p_sync_error_message" "text", "p_increment_total" boolean, "p_increment_successful" boolean) OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."update_updated_at_column"() RETURNS "trigger"
    LANGUAGE "plpgsql"
    AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;


ALTER FUNCTION "public"."update_updated_at_column"() OWNER TO "postgres";

SET default_tablespace = '';

SET default_table_access_method = "heap";


CREATE TABLE IF NOT EXISTS "public"."brand_settings" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "primary_color" "text" DEFAULT '#7B61FF'::"text" NOT NULL,
    "secondary_color" "text" DEFAULT '#00FFB2'::"text" NOT NULL,
    "accent_color" "text" DEFAULT '#F3C969'::"text" NOT NULL,
    "background_color" "text" DEFAULT '#0F0F0F'::"text" NOT NULL,
    "text_color" "text" DEFAULT '#FFFFFF'::"text" NOT NULL,
    "ui" "jsonb" DEFAULT '{"footerText": "© 2024 Dashboard. All rights reserved.", "loginTitle": "Welcome to Dashboard", "dashboardTitle": "Dashboard", "welcomeMessage": "Welcome to your dashboard"}'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "created_by" "uuid",
    "updated_by" "uuid",
    "logo_file_path" "text",
    "background_image_file_path" "text",
    "tagline" "text",
    "copyright_text" "text",
    "application_name" "text" DEFAULT 'Dashboard'::"text",
    "company_name" "text" DEFAULT 'Dashboard'::"text",
    "company_description" "text" DEFAULT 'Multi-tenant dashboard platform'::"text",
    "support_email" "text" DEFAULT 'support@dashboard.com'::"text"
);


ALTER TABLE "public"."brand_settings" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."clients" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "name" "text" NOT NULL,
    "slug" "text" NOT NULL,
    "tabs" "jsonb" DEFAULT '[]'::"jsonb",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "company_name" "text" NOT NULL,
    "logo_url" "text",
    "allowed_categories" "text"[] DEFAULT '{}'::"text"[],
    "client_type" "text" DEFAULT 'client'::"text",
    "owner_id" "uuid",
    "data_source" "text" DEFAULT 'google-sheets'::"text",
    "google_sheets_url" "text",
    "google_sheets_tabs" "text"[],
    "sheet_type" "text" DEFAULT 'client-dashboard'::"text",
    "google_sheets" "jsonb" DEFAULT '[]'::"jsonb",
    CONSTRAINT "clients_client_type_check" CHECK (("client_type" = ANY (ARRAY['client'::"text", 'undeniable'::"text"])))
);


ALTER TABLE "public"."clients" OWNER TO "postgres";


COMMENT ON COLUMN "public"."clients"."data_source" IS 'Data source type: google-sheets or excel-import';



COMMENT ON COLUMN "public"."clients"."google_sheets_url" IS 'Google Sheets URL for data source';



COMMENT ON COLUMN "public"."clients"."google_sheets_tabs" IS 'Array of selected Google Sheets tab names';



COMMENT ON COLUMN "public"."clients"."sheet_type" IS 'Sheet type: client-dashboard or undeniable-dashboard';



COMMENT ON COLUMN "public"."clients"."google_sheets" IS 'JSONB array storing multi-sheet configuration with tabs and selection data';



CREATE TABLE IF NOT EXISTS "public"."invitations" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "email" "text" NOT NULL,
    "client_id" "uuid",
    "role" "text" NOT NULL,
    "invited_by" "uuid",
    "invited_by_email" "text",
    "invitation_token" "text" NOT NULL,
    "expires_at" timestamp with time zone NOT NULL,
    "is_used" boolean DEFAULT false,
    "used_at" timestamp with time zone,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "invitations_role_check" CHECK (("role" = ANY (ARRAY['undeniable'::"text", 'staff'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."invitations" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metric_definitions" (
    "metric_name" character varying NOT NULL,
    "categories" "text"[] NOT NULL,
    "is_calculated" boolean DEFAULT false,
    "calculation_formula" "text",
    "created_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."metric_definitions" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."metrics" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "date" "date" NOT NULL,
    "category" character varying NOT NULL,
    "metric_name" character varying NOT NULL,
    "value" numeric(15,2) NOT NULL,
    "is_calculated" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    "data_source" "text" DEFAULT 'google-sheets'::"text",
    "google_sheet_id" "text",
    "sheet_name" "text",
    "tab_name" "text",
    "tab_gid" "text",
    "data_source_type" character varying(20) DEFAULT 'google_sheets'::character varying,
    "data_source_id" character varying(255),
    "target_value" numeric(15,2),
    "metric_type" "text" DEFAULT 'actual'::"text",
    CONSTRAINT "metrics_data_source_check" CHECK (("data_source" = ANY (ARRAY['google-sheets'::"text", 'excel-import'::"text"])))
);


ALTER TABLE "public"."metrics" OWNER TO "postgres";


COMMENT ON COLUMN "public"."metrics"."is_calculated" IS 'Boolean flag indicating if this metric is calculated/derived (true) or raw data (false)';



COMMENT ON COLUMN "public"."metrics"."data_source" IS 'Data source type: google-sheets or excel-import';



COMMENT ON COLUMN "public"."metrics"."google_sheet_id" IS 'Google Sheets spreadsheet ID';



COMMENT ON COLUMN "public"."metrics"."sheet_name" IS 'Google Sheets spreadsheet name';



COMMENT ON COLUMN "public"."metrics"."tab_name" IS 'Google Sheets worksheet name';



COMMENT ON COLUMN "public"."metrics"."tab_gid" IS 'Google Sheets tab GID for tracking';



COMMENT ON COLUMN "public"."metrics"."data_source_type" IS 'Type of data source: google_sheets, excel_import, csv_import';



COMMENT ON COLUMN "public"."metrics"."data_source_id" IS 'Unique identifier for the data source (spreadsheet ID, file name, etc.)';



COMMENT ON COLUMN "public"."metrics"."target_value" IS 'Target/goal value for this metric';



COMMENT ON COLUMN "public"."metrics"."metric_type" IS 'Type of metric: actual, target, or calculated';



CREATE TABLE IF NOT EXISTS "public"."sync_status" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "google_sheet_id" "text" NOT NULL,
    "sheet_name" "text" NOT NULL,
    "sync_status" character varying DEFAULT 'pending'::character varying,
    "last_sync_at" timestamp with time zone,
    "last_successful_sync_at" timestamp with time zone,
    "sync_error_message" "text",
    "total_sync_count" integer DEFAULT 0,
    "successful_sync_count" integer DEFAULT 0,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."sync_status" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_client_access" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "client_id" "uuid",
    "role" "text" NOT NULL,
    "granted_by" "uuid",
    "granted_by_email" "text",
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "user_client_access_role_check" CHECK (("role" = ANY (ARRAY['undeniable'::"text", 'staff'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."user_client_access" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notification_preferences" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "sync_notifications" boolean DEFAULT true,
    "error_alerts" boolean DEFAULT true,
    "client_changes" boolean DEFAULT true,
    "system_events" boolean DEFAULT true,
    "edge_function_failures" boolean DEFAULT true,
    "data_integrity_issues" boolean DEFAULT true,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notification_preferences" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."user_notifications" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid" NOT NULL,
    "type" character varying(50) NOT NULL,
    "title" character varying(255) NOT NULL,
    "message" "text" NOT NULL,
    "data" "jsonb",
    "read" boolean DEFAULT false,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"()
);


ALTER TABLE "public"."user_notifications" OWNER TO "postgres";


CREATE TABLE IF NOT EXISTS "public"."users" (
    "id" "uuid" DEFAULT "gen_random_uuid"() NOT NULL,
    "user_id" "uuid",
    "email" "text" NOT NULL,
    "first_name" "text",
    "last_name" "text",
    "global_role" "text" NOT NULL,
    "created_at" timestamp with time zone DEFAULT "now"(),
    "updated_at" timestamp with time zone DEFAULT "now"(),
    CONSTRAINT "users_global_role_check" CHECK (("global_role" = ANY (ARRAY['undeniable'::"text", 'staff'::"text", 'client'::"text"])))
);


ALTER TABLE "public"."users" OWNER TO "postgres";


ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_slug_key" UNIQUE ("slug");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invitation_token_key" UNIQUE ("invitation_token");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metric_definitions"
    ADD CONSTRAINT "metric_definitions_pkey" PRIMARY KEY ("metric_name");



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_unique_per_sheet_tab_type" UNIQUE ("user_id", "client_id", "google_sheet_id", "sheet_name", "tab_name", "date", "category", "metric_name", "metric_type");



ALTER TABLE ONLY "public"."sync_status"
    ADD CONSTRAINT "sync_status_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."sync_status"
    ADD CONSTRAINT "sync_status_user_id_client_id_google_sheet_id_sheet_name_key" UNIQUE ("user_id", "client_id", "google_sheet_id", "sheet_name");



ALTER TABLE ONLY "public"."user_client_access"
    ADD CONSTRAINT "user_client_access_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_key" UNIQUE ("user_id");



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_pkey" PRIMARY KEY ("id");



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_key" UNIQUE ("user_id");



CREATE UNIQUE INDEX "brand_settings_single_record" ON "public"."brand_settings" USING "btree" ((1));



CREATE INDEX "idx_invitations_client" ON "public"."invitations" USING "btree" ("client_id");



CREATE INDEX "idx_invitations_email" ON "public"."invitations" USING "btree" ("email");



CREATE INDEX "idx_invitations_token" ON "public"."invitations" USING "btree" ("invitation_token");



CREATE INDEX "idx_metrics_category" ON "public"."metrics" USING "btree" ("category");



CREATE INDEX "idx_metrics_category_type" ON "public"."metrics" USING "btree" ("category", "metric_type");



CREATE INDEX "idx_metrics_client_data_source" ON "public"."metrics" USING "btree" ("client_id", "data_source_type");



CREATE INDEX "idx_metrics_client_sheet" ON "public"."metrics" USING "btree" ("client_id", "sheet_name");



CREATE INDEX "idx_metrics_data_source" ON "public"."metrics" USING "btree" ("data_source");



CREATE INDEX "idx_metrics_data_source_id" ON "public"."metrics" USING "btree" ("data_source_id");



CREATE INDEX "idx_metrics_data_source_type" ON "public"."metrics" USING "btree" ("data_source_type");



CREATE INDEX "idx_metrics_date_category" ON "public"."metrics" USING "btree" ("date", "category");



CREATE INDEX "idx_metrics_google_sheet" ON "public"."metrics" USING "btree" ("google_sheet_id");



CREATE INDEX "idx_metrics_metric_name" ON "public"."metrics" USING "btree" ("metric_name");



CREATE INDEX "idx_metrics_metric_type" ON "public"."metrics" USING "btree" ("metric_type");



CREATE INDEX "idx_metrics_sheet_tab" ON "public"."metrics" USING "btree" ("sheet_name", "tab_name");



CREATE INDEX "idx_metrics_sheet_tab_date" ON "public"."metrics" USING "btree" ("sheet_name", "tab_name", "date");



CREATE INDEX "idx_metrics_target_value" ON "public"."metrics" USING "btree" ("target_value") WHERE ("target_value" IS NOT NULL);



CREATE INDEX "idx_metrics_user_client_data_source" ON "public"."metrics" USING "btree" ("user_id", "client_id", "data_source_type");



CREATE INDEX "idx_metrics_user_client_date" ON "public"."metrics" USING "btree" ("user_id", "client_id", "date");



CREATE INDEX "idx_metrics_user_client_sheet" ON "public"."metrics" USING "btree" ("user_id", "client_id", "sheet_name");



CREATE INDEX "idx_metrics_user_data_source" ON "public"."metrics" USING "btree" ("user_id", "data_source_type");



CREATE INDEX "idx_metrics_user_sheet" ON "public"."metrics" USING "btree" ("user_id", "sheet_name");



CREATE INDEX "idx_sync_status_user_client" ON "public"."sync_status" USING "btree" ("user_id", "client_id");



CREATE INDEX "idx_user_notification_preferences_user_id" ON "public"."user_notification_preferences" USING "btree" ("user_id");



CREATE INDEX "idx_user_notifications_created_at" ON "public"."user_notifications" USING "btree" ("created_at");



CREATE INDEX "idx_user_notifications_read" ON "public"."user_notifications" USING "btree" ("read");



CREATE INDEX "idx_user_notifications_user_id" ON "public"."user_notifications" USING "btree" ("user_id");



CREATE UNIQUE INDEX "user_client_access_user_id_client_id_unique" ON "public"."user_client_access" USING "btree" ("user_id", "client_id") WHERE ("client_id" IS NOT NULL);



CREATE UNIQUE INDEX "user_client_access_user_id_global_unique" ON "public"."user_client_access" USING "btree" ("user_id") WHERE ("client_id" IS NULL);



CREATE OR REPLACE TRIGGER "brand_settings_updated_at" BEFORE UPDATE ON "public"."brand_settings" FOR EACH ROW EXECUTE FUNCTION "public"."update_brand_settings_updated_at"();



CREATE OR REPLACE TRIGGER "update_user_notification_preferences_updated_at" BEFORE UPDATE ON "public"."user_notification_preferences" FOR EACH ROW EXECUTE FUNCTION "public"."update_updated_at_column"();



CREATE OR REPLACE TRIGGER "update_user_notifications_updated_at" BEFORE UPDATE ON "public"."user_notifications" FOR EACH ROW EXECUTE FUNCTION "public"."update_notifications_updated_at_column"();



ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."brand_settings"
    ADD CONSTRAINT "brand_settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."clients"
    ADD CONSTRAINT "clients_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."invitations"
    ADD CONSTRAINT "invitations_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."metrics"
    ADD CONSTRAINT "metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_status"
    ADD CONSTRAINT "sync_status_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."sync_status"
    ADD CONSTRAINT "sync_status_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_client_access"
    ADD CONSTRAINT "user_client_access_client_id_fkey" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_client_access"
    ADD CONSTRAINT "user_client_access_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "auth"."users"("id");



ALTER TABLE ONLY "public"."user_client_access"
    ADD CONSTRAINT "user_client_access_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notification_preferences"
    ADD CONSTRAINT "user_notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."user_notifications"
    ADD CONSTRAINT "user_notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



ALTER TABLE ONLY "public"."users"
    ADD CONSTRAINT "users_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."users"("id") ON DELETE CASCADE;



CREATE POLICY "Allow all operations for authenticated users" ON "public"."user_notification_preferences" USING (("auth"."uid"() IS NOT NULL));



CREATE POLICY "Authenticated users can access all clients" ON "public"."clients" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access all metrics" ON "public"."metrics" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can access all sync_status" ON "public"."sync_status" USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Authenticated users can view metric definitions" ON "public"."metric_definitions" FOR SELECT USING (("auth"."role"() = 'authenticated'::"text"));



CREATE POLICY "Only undeniable users can insert brand settings" ON "public"."brand_settings" FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM "public"."user_client_access" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."role" = 'undeniable'::"text")))));



CREATE POLICY "Only undeniable users can update brand settings" ON "public"."brand_settings" FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM "public"."user_client_access" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."role" = 'undeniable'::"text")))));



CREATE POLICY "Only undeniable users can view brand settings" ON "public"."brand_settings" FOR SELECT USING ((EXISTS ( SELECT 1
   FROM "public"."user_client_access" "uca"
  WHERE (("uca"."user_id" = "auth"."uid"()) AND ("uca"."role" = 'undeniable'::"text")))));



CREATE POLICY "System can insert notifications for users" ON "public"."user_notifications" FOR INSERT WITH CHECK (true);



CREATE POLICY "Users can access their own preferences" ON "public"."user_notification_preferences" USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can update their own notifications" ON "public"."user_notifications" FOR UPDATE USING (("auth"."uid"() = "user_id"));



CREATE POLICY "Users can view their own notifications" ON "public"."user_notifications" FOR SELECT USING (("auth"."uid"() = "user_id"));



ALTER TABLE "public"."brand_settings" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."clients" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."invitations" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metric_definitions" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."metrics" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."sync_status" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_client_access" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "user_client_access_simple" ON "public"."user_client_access" USING (("auth"."uid"() IS NOT NULL)) WITH CHECK (("auth"."uid"() IS NOT NULL));



ALTER TABLE "public"."user_notification_preferences" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."user_notifications" ENABLE ROW LEVEL SECURITY;


ALTER TABLE "public"."users" ENABLE ROW LEVEL SECURITY;


CREATE POLICY "users_basic_access" ON "public"."users" USING (true) WITH CHECK (true);





ALTER PUBLICATION "supabase_realtime" OWNER TO "postgres";






GRANT USAGE ON SCHEMA "public" TO "postgres";
GRANT USAGE ON SCHEMA "public" TO "anon";
GRANT USAGE ON SCHEMA "public" TO "authenticated";
GRANT USAGE ON SCHEMA "public" TO "service_role";

























































































































































GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_token" "text", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_token" "text", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."accept_invitation"("p_invitation_token" "text", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."add_data_source_to_tab"("p_client_id" "uuid", "p_tab_id" "text", "p_data_source_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."add_data_source_to_tab"("p_client_id" "uuid", "p_tab_id" "text", "p_data_source_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."add_data_source_to_tab"("p_client_id" "uuid", "p_tab_id" "text", "p_data_source_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_all_unowned_clients"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_all_unowned_clients"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_all_unowned_clients"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_client_ownership"("p_client_id" "uuid", "p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_client_ownership"("p_client_id" "uuid", "p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_client_ownership"("p_client_id" "uuid", "p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_default_client"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_default_client"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_default_client"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_retroactive_client_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."assign_retroactive_client_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_retroactive_client_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."assign_user_role"("p_user_id" "uuid", "p_role_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."calculate_conversion_rates"("p_user_id" "uuid", "p_client_id" "uuid", "p_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."calculate_conversion_rates"("p_user_id" "uuid", "p_client_id" "uuid", "p_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."calculate_conversion_rates"("p_user_id" "uuid", "p_client_id" "uuid", "p_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."can_access_client"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."can_access_client"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."check_metric_usage"("p_user_id" "uuid", "p_metric_name" character varying) TO "anon";
GRANT ALL ON FUNCTION "public"."check_metric_usage"("p_user_id" "uuid", "p_metric_name" character varying) TO "authenticated";
GRANT ALL ON FUNCTION "public"."check_metric_usage"("p_user_id" "uuid", "p_metric_name" character varying) TO "service_role";



GRANT ALL ON FUNCTION "public"."cleanup_old_metric_entries"("p_user_id" "uuid", "p_days_old" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."cleanup_old_metric_entries"("p_user_id" "uuid", "p_days_old" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."cleanup_old_metric_entries"("p_user_id" "uuid", "p_days_old" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."create_google_sheets_data_sources"("p_client_id" "uuid", "p_base_name" "text", "p_spreadsheet_id" "text", "p_selected_tabs" "jsonb") TO "anon";
GRANT ALL ON FUNCTION "public"."create_google_sheets_data_sources"("p_client_id" "uuid", "p_base_name" "text", "p_spreadsheet_id" "text", "p_selected_tabs" "jsonb") TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_google_sheets_data_sources"("p_client_id" "uuid", "p_base_name" "text", "p_spreadsheet_id" "text", "p_selected_tabs" "jsonb") TO "service_role";



GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_client_id" "uuid", "p_role" "text", "p_invited_by_email" "text", "p_expires_in_hours" integer) TO "anon";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_client_id" "uuid", "p_role" "text", "p_invited_by_email" "text", "p_expires_in_hours" integer) TO "authenticated";
GRANT ALL ON FUNCTION "public"."create_invitation"("p_email" "text", "p_client_id" "uuid", "p_role" "text", "p_invited_by_email" "text", "p_expires_in_hours" integer) TO "service_role";



GRANT ALL ON FUNCTION "public"."detect_duplicate_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."detect_duplicate_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."detect_duplicate_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."discover_google_sheets_tabs"("p_spreadsheet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."discover_google_sheets_tabs"("p_spreadsheet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."discover_google_sheets_tabs"("p_spreadsheet_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_clients"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_clients"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_clients"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_accessible_sheets"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_accessible_sheets"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_accessible_sheets"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_all_users_with_roles_and_access"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_all_users_with_roles_and_access"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_all_users_with_roles_and_access"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_available_sheets_for_user"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_available_sheets_for_user"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_available_sheets_for_user"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_client_tabs_with_sources"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_client_tabs_with_sources"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_client_tabs_with_sources"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_configured_metrics"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_configured_metrics"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_configured_metrics"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_connection_stats"() TO "anon";
GRANT ALL ON FUNCTION "public"."get_connection_stats"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_connection_stats"() TO "service_role";



GRANT ALL ON FUNCTION "public"."get_data_source_breakdown"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_data_source_breakdown"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_data_source_breakdown"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_data_source_summary"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_data_source_summary"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_data_source_summary"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_hierarchical_data_from_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_hierarchical_data_from_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_hierarchical_data_from_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metric_configurations"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metric_configurations"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metric_configurations"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metrics_by_category"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metrics_by_data_source"("p_user_id" "uuid", "p_client_id" "uuid", "p_data_source_type" character varying, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics_by_data_source"("p_user_id" "uuid", "p_client_id" "uuid", "p_data_source_type" character varying, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metrics_by_data_source"("p_user_id" "uuid", "p_client_id" "uuid", "p_data_source_type" character varying, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metrics_by_sheet_tab"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text", "p_tab_name" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics_by_sheet_tab"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text", "p_tab_name" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metrics_by_sheet_tab"("p_user_id" "uuid", "p_client_id" "uuid", "p_sheet_name" "text", "p_tab_name" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_metrics_with_targets"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" "text", "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_metrics_with_targets"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" "text", "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_metrics_with_targets"("p_user_id" "uuid", "p_client_id" "uuid", "p_category" "text", "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_staff_discovered_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_staff_discovered_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_staff_discovered_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_staff_sheet_info"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_staff_sheet_info"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_staff_sheet_info"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_undeniable_dashboard_metrics"("p_user_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_undeniable_dashboard_metrics"("p_user_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_undeniable_dashboard_metrics"("p_user_id" "uuid", "p_category" character varying, "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_undeniable_discovered_metrics"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_undeniable_discovered_metrics"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_undeniable_discovered_metrics"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."get_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_unified_metrics"("p_user_id" "uuid", "p_client_id" "uuid", "p_include_data_sources" "text"[], "p_start_date" "date", "p_end_date" "date") TO "anon";
GRANT ALL ON FUNCTION "public"."get_unified_metrics"("p_user_id" "uuid", "p_client_id" "uuid", "p_include_data_sources" "text"[], "p_start_date" "date", "p_end_date" "date") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_unified_metrics"("p_user_id" "uuid", "p_client_id" "uuid", "p_include_data_sources" "text"[], "p_start_date" "date", "p_end_date" "date") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_access"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_access"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_access"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_access_level"("p_user_id" "uuid", "p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_access_level"("p_user_id" "uuid", "p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_access_level"("p_user_id" "uuid", "p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_client_access_level"("p_client_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_client_access_level"("p_client_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_client_access_level"("p_client_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_profile"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."get_user_role"("p_user_id" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."get_user_role"("p_user_id" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."get_user_role"("p_user_id" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."grant_user_access"("p_user_id" "uuid", "p_role" "text", "p_client_id" "uuid", "p_granted_by" "uuid") TO "anon";
GRANT ALL ON FUNCTION "public"."grant_user_access"("p_user_id" "uuid", "p_role" "text", "p_client_id" "uuid", "p_granted_by" "uuid") TO "authenticated";
GRANT ALL ON FUNCTION "public"."grant_user_access"("p_user_id" "uuid", "p_role" "text", "p_client_id" "uuid", "p_granted_by" "uuid") TO "service_role";



GRANT ALL ON FUNCTION "public"."migrate_metrics_to_discovered_metrics"() TO "anon";
GRANT ALL ON FUNCTION "public"."migrate_metrics_to_discovered_metrics"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."migrate_metrics_to_discovered_metrics"() TO "service_role";



GRANT ALL ON FUNCTION "public"."run_metric_maintenance"("p_user_id" "uuid", "p_cleanup_old_days" integer, "p_remove_duplicates" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."run_metric_maintenance"("p_user_id" "uuid", "p_cleanup_old_days" integer, "p_remove_duplicates" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."run_metric_maintenance"("p_user_id" "uuid", "p_cleanup_old_days" integer, "p_remove_duplicates" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_delete_sheet_metrics"("p_user_id" "uuid", "p_sheet_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_delete_sheet_metrics"("p_user_id" "uuid", "p_sheet_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_delete_sheet_metrics"("p_user_id" "uuid", "p_sheet_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."safe_grant_client_access"("p_client_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_granted_by_email" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."safe_grant_client_access"("p_client_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_granted_by_email" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."safe_grant_client_access"("p_client_id" "uuid", "p_user_id" "uuid", "p_role" "text", "p_granted_by_email" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_brand_settings_updated_at"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_brand_settings_updated_at"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_brand_settings_updated_at"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_client_sync_status"("p_client_id" "uuid", "p_sync_status" character varying, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_client_sync_status"("p_client_id" "uuid", "p_sync_status" character varying, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_client_sync_status"("p_client_id" "uuid", "p_sync_status" character varying, "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_notifications_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_notifications_updated_at_column"() TO "service_role";



GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_error_message" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_error_message" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_error_message" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text") TO "anon";
GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text") TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_staff_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text") TO "service_role";



GRANT ALL ON FUNCTION "public"."update_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text", "p_last_successful_sync_at" timestamp with time zone, "p_sync_error_message" "text", "p_increment_total" boolean, "p_increment_successful" boolean) TO "anon";
GRANT ALL ON FUNCTION "public"."update_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text", "p_last_successful_sync_at" timestamp with time zone, "p_sync_error_message" "text", "p_increment_total" boolean, "p_increment_successful" boolean) TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_undeniable_sync_status"("p_user_id" "uuid", "p_google_sheet_id" "text", "p_sync_status" character varying, "p_last_sync_at" timestamp with time zone, "p_sheet_name" "text", "p_last_successful_sync_at" timestamp with time zone, "p_sync_error_message" "text", "p_increment_total" boolean, "p_increment_successful" boolean) TO "service_role";



GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "anon";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "authenticated";
GRANT ALL ON FUNCTION "public"."update_updated_at_column"() TO "service_role";


















GRANT ALL ON TABLE "public"."brand_settings" TO "anon";
GRANT ALL ON TABLE "public"."brand_settings" TO "authenticated";
GRANT ALL ON TABLE "public"."brand_settings" TO "service_role";



GRANT ALL ON TABLE "public"."clients" TO "anon";
GRANT ALL ON TABLE "public"."clients" TO "authenticated";
GRANT ALL ON TABLE "public"."clients" TO "service_role";



GRANT ALL ON TABLE "public"."invitations" TO "anon";
GRANT ALL ON TABLE "public"."invitations" TO "authenticated";
GRANT ALL ON TABLE "public"."invitations" TO "service_role";



GRANT ALL ON TABLE "public"."metric_definitions" TO "anon";
GRANT ALL ON TABLE "public"."metric_definitions" TO "authenticated";
GRANT ALL ON TABLE "public"."metric_definitions" TO "service_role";



GRANT ALL ON TABLE "public"."metrics" TO "anon";
GRANT ALL ON TABLE "public"."metrics" TO "authenticated";
GRANT ALL ON TABLE "public"."metrics" TO "service_role";



GRANT ALL ON TABLE "public"."sync_status" TO "anon";
GRANT ALL ON TABLE "public"."sync_status" TO "authenticated";
GRANT ALL ON TABLE "public"."sync_status" TO "service_role";



GRANT ALL ON TABLE "public"."user_client_access" TO "anon";
GRANT ALL ON TABLE "public"."user_client_access" TO "authenticated";
GRANT ALL ON TABLE "public"."user_client_access" TO "service_role";



GRANT ALL ON TABLE "public"."user_notification_preferences" TO "anon";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notification_preferences" TO "service_role";



GRANT ALL ON TABLE "public"."user_notifications" TO "anon";
GRANT ALL ON TABLE "public"."user_notifications" TO "authenticated";
GRANT ALL ON TABLE "public"."user_notifications" TO "service_role";



GRANT ALL ON TABLE "public"."users" TO "anon";
GRANT ALL ON TABLE "public"."users" TO "authenticated";
GRANT ALL ON TABLE "public"."users" TO "service_role";









ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON SEQUENCES TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON FUNCTIONS TO "service_role";






ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "postgres";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "anon";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "authenticated";
ALTER DEFAULT PRIVILEGES FOR ROLE "postgres" IN SCHEMA "public" GRANT ALL ON TABLES TO "service_role";






























RESET ALL;
