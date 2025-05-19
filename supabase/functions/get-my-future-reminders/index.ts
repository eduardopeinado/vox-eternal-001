import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure it's a GET request
  if (req.method !== 'GET') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    // Create Supabase client with admin privileges (needed to bypass RLS if necessary,
    // but ideally RLS policies should allow users to read their own reminders)
    // Consider using the user's JWT directly if RLS is sufficient.
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
      // Or: Use createClient with auth header if RLS handles permissions
      // const supabaseClient = createClient<Database>(
      //   Deno.env.get('SUPABASE_URL') ?? '',
      //   Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      //   { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
      // )
    )

    // Get user ID from JWT
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''))
    if (userError || !user) {
      console.error('Auth error:', userError)
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const currentUserId = user.id

    // --- Fetch Scheduled Reminders for the User ---
    // Select necessary fields from future_reminders
    // Optionally join with future_reminder_capsules and capsules if needed immediately
    // For simplicity here, we fetch only the reminders first. The frontend
    // can fetch capsule details separately if/when needed.
    const { data: reminders, error: fetchError } = await supabaseAdmin
      .from('future_reminders') // Revert back to the correct table name
      .select(`
        id,
        recipient_email,
        recipient_name,
        delivery_method,
        scheduled_delivery_at,
        title,
        message,
        status,
        created_at,
        access_token
      `) // Select only fields from future_reminders
      .eq('creator_user_id', currentUserId)
      .eq('status', 'scheduled') // Only fetch scheduled ones
      .order('scheduled_delivery_at', { ascending: true }) // Order by scheduled date

    if (fetchError) {
      console.error('Error fetching reminders:', fetchError)
      throw new Error('Failed to fetch reminders')
    }

    // --- Return Success Response ---
    return new Response(
      JSON.stringify(reminders ?? []), // Return empty array if null
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200, // OK
      }
    )

  } catch (error) {
    console.error('Function error:', error.message)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
