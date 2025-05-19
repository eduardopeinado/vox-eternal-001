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
    // Extract access_token from the URL path
    // Assuming the URL pattern is /functions/v1/get-reminder-details-public/{access_token}
    const url = new URL(req.url)
    const pathParts = url.pathname.split('/')
    const accessToken = pathParts[pathParts.length - 1] // Get the last part

    if (!accessToken) {
        return new Response(JSON.stringify({ error: 'Missing access_token in URL path' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Create Supabase client using ANON KEY (public access)
    const supabaseClient = createClient<Database>(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    // --- Fetch Reminder by Access Token ---
    const { data: reminder, error: fetchError } = await supabaseClient
      .from('future_reminders')
      .select(`
        creator_user_id,
        scheduled_delivery_at,
        title,
        message,
        status,
        delivery_method,
        recipient_email,
        future_reminder_capsules!inner (
          capsules!inner (
            id,
            titulo,
            descripcion,
            portada_url,
            tipo
            -- Add other capsule details needed for display
          )
        ),
        usuarios ( nombre ) -- Fetch creator's name
      `)
      .eq('access_token', accessToken)
      .maybeSingle() // Use maybeSingle as it might not exist

    if (fetchError) {
        console.error('Error fetching reminder by token:', fetchError)
        throw new Error('Failed to fetch reminder details')
    }

    if (!reminder || reminder.status === 'cancelled') {
        return new Response(JSON.stringify({ error: 'Reminder not found or has been cancelled' }), { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- Check Scheduled Time vs Current Time ---
    const scheduledTime = new Date(reminder.scheduled_delivery_at)
    const currentTime = new Date()

    if (scheduledTime > currentTime) {
      // Reminder is not yet available
      return new Response(
        JSON.stringify({
          status: 'scheduled',
          scheduled_delivery_at: reminder.scheduled_delivery_at,
          message: `Este recordatorio estará disponible el ${scheduledTime.toLocaleString()}.` // Adjust formatting as needed
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200, // OK, but content not ready
        }
      )
    }

    // --- Reminder is Available ---
    // Prepare the response data
    const responseData = {
      status: 'available', // Or use reminder.status if Cron Job updates it reliably
      scheduled_delivery_at: reminder.scheduled_delivery_at,
      creator_name: reminder.usuarios?.nombre ?? 'Alguien especial', // Handle null creator name
      title: reminder.title,
      message: reminder.message,
      delivery_method: reminder.delivery_method,
      recipient_email: reminder.recipient_email, // Include if needed on frontend
      capsules: reminder.future_reminder_capsules.map(frc => ({
        id: frc.capsules.id,
        titulo: frc.capsules.titulo,
        descripcion: frc.capsules.descripcion,
        portada_url: frc.capsules.portada_url,
        tipo: frc.capsules.tipo,
        // Map other capsule fields as needed
      }))
    }

    return new Response(
      JSON.stringify(responseData),
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
