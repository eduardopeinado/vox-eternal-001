import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
// Temporarily remove local import and define headers inline
// import { corsHeaders } from '../_shared/cors'

// Define CORS headers directly for testing
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE', // Ensure OPTIONS is included
}

console.log(`Function "accept-invitation" up and running!`)

interface AcceptPayload {
  share_token: string;
}

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: AcceptPayload = await req.json()
    const { share_token } = payload

    if (!share_token) {
      throw new Error("Missing 'share_token' in request body")
    }

    // Create Supabase client with Auth context
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Get the authenticated user (the invitee accepting the invitation)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser()
    if (userError || !user) {
      console.error('User error:', userError)
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }
    const invitee_user_id = user.id

    // --- Transaction Start ---
    // Use a transaction (via RPC call to a db function) for atomicity if possible,
    // especially if updating multiple tables. For simplicity here, we do sequential checks.
    // If Supabase JS client supports transactions directly in the future, use that.
    // Alternatively, create a PostgreSQL function (accept_invitation_txn) and call it via RPC.

    // 1. Find the invitation by token and check its status
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('capsule_invitations')
      .select('id, capsule_id, status, expires_at')
      .eq('share_token', share_token)
      .maybeSingle()

    if (invitationError) {
      console.error('Invitation fetch error:', invitationError)
      throw new Error(`Failed to fetch invitation: ${invitationError.message}`)
    }

    if (!invitation) {
      return new Response(JSON.stringify({ error: 'Invitation not found or invalid token' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      })
    }

    if (invitation.status !== 'pending') {
      // Allow idempotent requests? If already accepted by this user, maybe return success?
      // For now, treat non-pending as an error or already processed.
      return new Response(JSON.stringify({ error: `Invitation already ${invitation.status}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      })
    }

    // Optional: Check expiry
    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
       // Optionally update status to 'expired' here before returning
       await supabaseClient
         .from('capsule_invitations')
         .update({ status: 'expired' })
         .eq('id', invitation.id);

      return new Response(JSON.stringify({ error: 'Invitation has expired' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 410, // Gone
      })
    }

    const capsule_id = invitation.capsule_id;
    const invitation_id = invitation.id;

    // 2. Add the user to capsule_contributors
    // Use upsert to handle potential race conditions or retries gracefully,
    // or rely on the unique constraint to throw an error if already added.
    // Here, we assume the status check prevents duplicates for the same user accepting twice.
    const { error: contributorError } = await supabaseClient
      .from('capsule_contributors')
      .insert({
        capsule_id: capsule_id,
        user_id: invitee_user_id,
        invitation_id: invitation_id,
        role: 'contributor', // Default role
      })

    if (contributorError) {
        // Check if it's a unique constraint violation (23505)
        if (contributorError.code === '23505') {
             console.warn(`User ${invitee_user_id} might already be a contributor for capsule ${capsule_id}. Proceeding.`);
             // If the user is already a contributor, we can arguably still mark the invitation as accepted.
        } else {
            console.error('Contributor insert error:', contributorError)
            throw new Error(`Failed to add user as contributor: ${contributorError.message}`)
        }
    }


    // 3. Update the invitation status to 'accepted'
    const { error: updateError } = await supabaseClient
      .from('capsule_invitations')
      .update({ status: 'accepted' })
      .eq('id', invitation_id)

    if (updateError) {
      // This is problematic if the contributor was added but status update failed.
      // A database transaction would prevent this inconsistency.
      console.error('Invitation status update error:', updateError)
      // Consider how to handle this - maybe attempt rollback or log for manual review.
      throw new Error(`Failed to update invitation status: ${updateError.message}`)
    }

    // --- Transaction End ---

    // 4. Return the capsule_id for redirection
    return new Response(JSON.stringify({ capsule_id }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error in accept-invitation function:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
