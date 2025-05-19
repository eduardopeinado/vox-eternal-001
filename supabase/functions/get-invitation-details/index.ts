import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Define CORS headers directly
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS', // Allow POST for body, OPTIONS for preflight
}

console.log(`Function "get-invitation-details" up and running!`)

interface RequestPayload {
  share_token: string;
}

// Interface for the data fetched including joins
interface InvitationDetails {
  id: string;
  message: string | null;
  status: string;
  expires_at: string | null;
  inviter_user_id: string;
  capsule_id: string;
  usuarios: { nombre: string | null } | null; // Joined inviter details
  capsulas: { titulo: string | null } | null; // Joined capsule details
}

// Interface for the response payload
interface ResponsePayload {
  inviterName: string;
  capsuleTitle: string;
  message: string | null;
}

serve(async (req: Request) => { // Add explicit type for req
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload: RequestPayload = await req.json()
    const { share_token } = payload

    if (!share_token) {
      throw new Error("Missing 'share_token' in request body");
    }

    // Create Supabase client using the SERVICE ROLE KEY to bypass RLS for reading user/capsule details
    // Ensure SERVICE_ROLE_KEY is set in Supabase Edge Function environment variables
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!serviceRoleKey) {
      console.error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
      throw new Error('Server configuration error: Missing service role key.');
    }

    const supabaseClient: SupabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      serviceRoleKey, // Use service role key
      { auth: { persistSession: false } } // Important for server-side clients
    );

    // 1. Find the invitation details WITH joins
    const { data: invitationData, error: invitationError } = await supabaseClient
      .from('capsule_invitations')
      .select(`
        id,
        message,
        status,
        expires_at,
        inviter_user_id,
        capsule_id,
        usuarios ( nombre ), 
        capsulas ( titulo ) 
      `) // Join with usuarios and capsulas
      .eq('share_token', share_token)
      .maybeSingle(); // Use maybeSingle as the token might not exist

    if (invitationError) {
      console.error('Error fetching invitation details with joins:', invitationError);
      throw new Error(`Database error: ${invitationError.message}`);
    }

    if (!invitationData) {
      return new Response(JSON.stringify({ error: 'Invitación no encontrada o inválida.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 404,
      });
    }

    // Cast to ensure type safety after check
    const invitation = invitationData as InvitationDetails;

    // 2. Validate invitation status and expiry (logic remains the same)
    if (invitation.status !== 'pending') {
      return new Response(JSON.stringify({ error: `Esta invitación ya ha sido ${invitation.status}.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 409, // Conflict
      })
    }

    if (invitation.expires_at && new Date(invitation.expires_at) < new Date()) {
      // Optionally update status to 'expired' here using service_role if needed,
      // but for a GET details function, just returning the error is fine.
      return new Response(JSON.stringify({ error: 'Esta invitación ha caducado.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 410, // Gone
      });
    }

    // 3. Prepare and return the details including names/titles
    const responsePayload: ResponsePayload = {
      inviterName: invitation.usuarios?.nombre || 'Alguien', // Use fetched name or fallback
      capsuleTitle: invitation.capsulas?.titulo || 'una cápsula', // Use fetched title or fallback
      message: invitation.message || null,
    };

    return new Response(JSON.stringify(responsePayload), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: unknown) { // Type error as unknown
    console.error('Error in get-invitation-details function:', error);
    let errorMessage = 'Internal server error.';
    if (error instanceof Error) {
      errorMessage = error.message;
    }

    // Check if it's a JSON parsing error specifically
    if (error instanceof SyntaxError) {
      errorMessage = 'Invalid request body: Malformed JSON.';
      return new Response(JSON.stringify({ error: errorMessage }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    // Return generic or specific error message for non-SyntaxError cases
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500, // Use 500 for general server errors
    });
  }
})
