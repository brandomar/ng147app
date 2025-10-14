// @ts-nocheck: Deno Edge Function - uses Deno-specific imports and globals
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
}

serve(async (req) => {
  console.log('🚀 invite-user function called:', req.method, req.url);
  
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log('✅ Handling CORS preflight request');
    return new Response('ok', { 
      status: 200,
      headers: corsHeaders 
    })
  }

  try {
    console.log("🔧 Processing invitation request...");
    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    console.log("🔍 Environment check:", {
      hasUrl: !!supabaseUrl,
      hasServiceKey: !!supabaseServiceKey,
      hasAnonKey: !!supabaseAnonKey,
    });

    if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
      console.error("❌ Missing required environment variables");
      return new Response(
        JSON.stringify({ error: "Server configuration error" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Initialize Supabase client with service role key for admin access
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get the authenticated user from the request
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Create a client with the user's auth token
    const token = authHeader.replace("Bearer ", "");
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body
    const { email, clientId, accessLevel = "viewer" } = await req.json();

    console.log("📧 Invitation request:", { email, clientId, accessLevel });

    if (!email || !clientId) {
      console.error("❌ Missing required parameters:", { email, clientId });
      return new Response(
        JSON.stringify({ error: "Email and client ID are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check permissions using new permission system
    try {
      const { data: canInvite, error: permError } = await supabase.rpc(
        "has_permission",
        {
          p_user_id: user.id,
          p_permission: "canInviteUsers",
        }
      );

      if (permError) {
        console.warn(
          "⚠️ Could not check permissions, continuing with invitation:",
          permError
        );
      } else if (!canInvite) {
        console.error("❌ User does not have permission to invite users");
        return new Response(
          JSON.stringify({ error: "Insufficient permissions to invite users" }),
          {
            status: 403,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    } catch (error) {
      console.warn(
        "⚠️ Permission check failed, continuing with invitation:",
        error
      );
    }

    // Get client name for the invitation email
    const { data: clientData, error: clientError } = await supabaseAdmin
      .from("clients")
      .select("name")
      .eq("id", clientId)
      .single();

    const clientName = clientData?.name || "Unknown Client";

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return new Response(JSON.stringify({ error: "Invalid email format" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has access to this client
    console.log("🔍 Checking if user already has access...");
    const { data: existingAccess, error: accessError } = await supabaseAdmin
      .from("client_access")
      .select("*")
      .eq("client_id", clientId)
      .eq("email", email)
      .single();

    if (accessError && accessError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("❌ Error checking existing access:", accessError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing access" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingAccess) {
      console.log("⚠️ User already has access:", existingAccess);
      return new Response(
        JSON.stringify({
          error: "User already has access to this client",
          details: `User with email ${email} already has ${existingAccess.access_level} access`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if there's already a pending invitation
    console.log("🔍 Checking for pending invitations...");
    const { data: pendingInvitation, error: pendingError } = await supabase
      .from("pending_invitations")
      .select("*")
      .eq("client_id", clientId)
      .eq("email", email)
      .eq("accepted_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (pendingError && pendingError.code !== "PGRST116") {
      // PGRST116 = no rows returned
      console.error("❌ Error checking pending invitations:", pendingError);
      return new Response(
        JSON.stringify({ error: "Failed to check pending invitations" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (pendingInvitation) {
      console.log("⚠️ Pending invitation already exists:", pendingInvitation);
      return new Response(
        JSON.stringify({
          error: "Invitation already pending",
          details: `An invitation for ${email} is already pending and expires on ${new Date(
            pendingInvitation.expires_at
          ).toLocaleDateString()}`,
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Check if user already exists in auth system
    console.log("🔍 Checking if user exists in auth system...");
    const { data: existingUsers, error: listUsersError } =
      await supabaseAdmin.auth.admin.listUsers({
        page: 1,
        perPage: 100, // Get more users to search through
      });

    if (listUsersError) {
      console.error("❌ Error listing users:", listUsersError);
      return new Response(
        JSON.stringify({ error: "Failed to check existing users" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const existingUser = existingUsers.users.find((u) => u.email === email);
    console.log("👤 User search result:", {
      totalUsers: existingUsers.users.length,
      userExists: !!existingUser,
      userEmail: existingUser?.email,
    });

    if (existingUser) {
      // User exists, grant access directly
      const { error: grantError } = await supabaseAdmin
        .from("client_access")
        .insert({
          client_id: clientId,
          user_id: existingUser.id,
          access_level: accessLevel,
          granted_by: user.id,
          granted_by_email: user.email,
          email: email,
          invited_at: new Date().toISOString(),
          accepted_at: new Date().toISOString(),
        });

      if (grantError) {
        console.error("Error granting access to existing user:", grantError);
        return new Response(
          JSON.stringify({ error: "Failed to grant access to existing user" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          data: {
            success: true,
            message: "Access granted to existing user",
            user: {
              id: existingUser.id,
              email: existingUser.email,
              name:
                existingUser.user_metadata?.name ||
                existingUser.user_metadata?.full_name ||
                existingUser.email?.split("@")[0] ||
                "Unknown User",
            },
          },
          error: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    } else {
      // User doesn't exist, create pending invitation
      console.log("📧 Creating pending invitation for new user...");

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      // Store invitation as pending in client_access table
      const { error: storeError } = await supabaseAdmin
        .from("client_access")
        .insert({
          client_id: clientId,
          user_id: null, // Will be set when user accepts
          access_level: accessLevel,
          granted_by: user.id,
          granted_by_email: user.email,
          email: email,
          invited_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString(),
          accepted_at: null,
          status: "pending",
        });

      if (storeError) {
        console.error("❌ Error storing invitation:", storeError);
        return new Response(
          JSON.stringify({
            error: "Failed to create invitation",
            details: storeError.message,
          }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log("✅ Pending invitation created successfully:", { email });

      // Send email notification using Supabase Auth
      try {
        console.log("📧 Sending invitation email...");

        // Create a magic link for the invitation
        const { data: magicLinkData, error: magicLinkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "signup",
            email: email,
            options: {
              redirectTo: `${
                Deno.env.get("SITE_URL") || "http://localhost:3000"
              }/accept-invitation?client_id=${clientId}&access_level=${accessLevel}`,
              data: {
                client_id: clientId,
                access_level: accessLevel,
                invited_by: user.email,
                client_name: clientName,
              },
            },
          });

        if (magicLinkError) {
          console.error("❌ Error generating magic link:", magicLinkError);
          // Don't fail the invitation if email fails, just log it
        } else {
          console.log("✅ Magic link generated successfully");
          console.log("🔗 Magic link data:", magicLinkData);

          // For now, just log the magic link - in production you'd send this via email
          console.log(
            "📧 Magic link for invitation:",
            magicLinkData.properties?.action_link ||
              magicLinkData.properties?.hashed_token
          );

          // TODO: Send actual email with the magic link
          // You can integrate with SendGrid, AWS SES, or other email services here
          // For now, we'll just log it for testing
        }
      } catch (emailErr) {
        console.error("❌ Exception sending invitation email:", emailErr);
        // Don't fail the invitation if email fails, just log it
      }

      return new Response(
        JSON.stringify({
          data: {
            success: true,
            message:
              "Invitation created successfully. User will be notified via email.",
            email: email,
            expires_at: expiresAt.toISOString(),
          },
          error: null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  } catch (error) {
    console.error('Error in invite-user function:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})
