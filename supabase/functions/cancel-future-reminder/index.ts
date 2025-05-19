import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Ensure it's a POST request (as invoked from frontend)
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 405,
    })
  }

  try {
    // Extract reminderId from the request body
    const body = await req.json()
    const reminderId = body?.reminderId

    if (!reminderId) {
        return new Response(JSON.stringify({ error: 'Missing reminderId in request body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create Supabase client with admin privileges
    const supabaseAdmin = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
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

    // --- Verify Ownership and Status ---
    const { data: existingReminder, error: fetchError } = await supabaseAdmin
      .from('future_reminders') // Revert back to the correct table name
      .select('creator_user_id, status')
      .eq('id', reminderId)
      .single()

    if (fetchError) {
        console.error('Error fetching reminder:', fetchError)
        if (fetchError.code === 'PGRST116') { // Not found
             return new Response(JSON.stringify({ error: 'Reminder not found' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
        throw new Error('Failed to fetch reminder')
    }

    if (existingReminder.creator_user_id !== currentUserId) {
        return new Response(JSON.stringify({ error: 'Forbidden: You are not the creator of this reminder' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Allow cancellation only if scheduled (or maybe failed?) - Decide based on requirements
    if (existingReminder.status !== 'scheduled') {
        return new Response(JSON.stringify({ error: `Cannot cancel reminder with status: ${existingReminder.status}` }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- Perform Update (Change Status to 'cancelled') ---
    const { error: updateError } = await supabaseAdmin
      .from('future_reminders') // Revert back to the correct table name
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', reminderId)
      .select('id') // Select something to confirm update worked if needed
      .single() // Ensure only one row is updated

    if (updateError) {
      console.error('Error cancelling reminder:', updateError)
      throw new Error('Failed to cancel reminder record')
    }

    // --- Return Success Response ---
    // Return 200 OK with a success message, as invoke expects a JSON response
    return new Response(
      JSON.stringify({ message: 'Reminder cancelled successfully' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
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
