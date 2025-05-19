import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import { Database } from '../_shared/database.types.ts'

// --- Resend Email Logic for Initial Notification ---
async function sendInitialNotificationEmail(
    notificationDetails: {
        recipient_email: string;
        recipient_name: string | null;
        creator_name: string | null;
        access_token: string;
        scheduled_delivery_at: string; // ISO string
    }
): Promise<boolean> {
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    const fromEmail = Deno.env.get('RESEND_FROM_EMAIL');
    const siteUrl = Deno.env.get('SITE_URL');

    if (!resendApiKey || !fromEmail || !siteUrl) {
        console.error('Missing Resend environment variables (API Key, From Email, or Site URL) for initial notification.');
        return false;
    }

    const subject = `Tienes un mensaje programado de ${notificationDetails.creator_name || 'alguien especial'} en Vox Eternal`;
    const reminderLink = `${siteUrl.replace(/\/$/, '')}/reminder/${notificationDetails.access_token}`; // Use /reminder/ link for consistency
    const deliveryDate = new Date(notificationDetails.scheduled_delivery_at).toLocaleDateString('es-ES', { // Format date nicely
        year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' // Assuming UTC, adjust if needed
    });

    const htmlBody = `
        <p>Hola ${notificationDetails.recipient_name || ''},</p>
        <p>${notificationDetails.creator_name || 'Alguien especial'} te ha programado un mensaje en Vox Eternal que podrás ver el ${deliveryDate}.</p>
        <p>Cuando llegue la fecha, podrás acceder a él usando el siguiente enlace:</p>
        <p><a href="${reminderLink}">Ver Mensaje Programado</a></p>
        <p>¡Esperamos que lo disfrutes!</p>
        <p>Saludos,</p>
        <p>El equipo de Vox Eternal</p>
    `;

    console.log(`Attempting to send initial notification email via Resend to ${notificationDetails.recipient_email}`);

    try {
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${resendApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                from: fromEmail,
                to: [notificationDetails.recipient_email],
                subject: subject,
                html: htmlBody,
            }),
        });

        if (response.ok) {
            const data = await response.json();
            console.log(`Initial notification email sent successfully via Resend. Resend ID: ${data.id}`);
            return true;
        } else {
            const errorData = await response.json();
            console.error(`Failed to send initial notification email via Resend. Status: ${response.status}`, errorData);
            return false;
        }
    } catch (error) {
        console.error(`Error calling Resend API for initial notification:`, error);
        return false;
    }
}
// --- End Resend Email Logic ---


/**
 * Define the expected request body structure.
 * Ahora soporta file_ids: string[] para asociar archivos multimedia (recuerdos) al mensaje.
 */
interface CreateReminderPayload {
  recipient_email?: string
  recipient_name?: string
  delivery_method: 'email' | 'qr_code'
  scheduled_delivery_at: string // ISO 8601 string
  title?: string
  message?: string
  capsule_ids: string[] // Array of capsule UUIDs containing selected recuerdos
  recuerdo_ids?: string[] // Optional: Array of specific recuerdo UUIDs selected
  file_ids?: string[] // NUEVO: Array de IDs de recuerdos a asociar como archivos multimedia
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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
    const creatorUserId = user.id

    // Parse request body
    const payload: CreateReminderPayload = await req.json()

    // --- Input Validation ---
    if (!payload.delivery_method || !['email', 'qr_code'].includes(payload.delivery_method)) {
      return new Response(JSON.stringify({ error: 'Invalid delivery_method' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (payload.delivery_method === 'email' && !payload.recipient_email) {
      return new Response(JSON.stringify({ error: 'recipient_email is required for email delivery' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!payload.scheduled_delivery_at || isNaN(Date.parse(payload.scheduled_delivery_at))) {
        return new Response(JSON.stringify({ error: 'Invalid or missing scheduled_delivery_at' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
     // Basic check for date being in the future (consider timezones more carefully if needed)
    if (new Date(payload.scheduled_delivery_at) <= new Date()) {
        return new Response(JSON.stringify({ error: 'scheduled_delivery_at must be in the future' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!payload.capsule_ids || !Array.isArray(payload.capsule_ids) || payload.capsule_ids.length === 0) {
      return new Response(JSON.stringify({ error: 'capsule_ids array is required and cannot be empty' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    // Validate recuerdo_ids if present
    if (payload.recuerdo_ids && (!Array.isArray(payload.recuerdo_ids))) { // Allow empty array if sent
       return new Response(JSON.stringify({ error: 'recuerdo_ids must be an array if provided' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    // Ensure at least one capsule or recuerdo is selected (though UI likely enforces capsule selection if recuerdos are selected)
    if (payload.capsule_ids.length === 0 && (!payload.recuerdo_ids || payload.recuerdo_ids.length === 0)) {
        return new Response(JSON.stringify({ error: 'At least one capsule or recuerdo must be selected' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // --- Ownership and Existence Validation ---
    // 1. Validate Capsule Ownership and Existence
    const { data: ownedCapsules, error: capsuleCheckError } = await supabaseAdmin
      .from('capsulas')
      .select('id')
      .eq('usuario_id', creatorUserId)
      .in('id', payload.capsule_ids)

    if (capsuleCheckError) {
      console.error('Error checking capsule ownership:', capsuleCheckError)
      throw new Error('Database error during capsule validation')
    }
    // Check if the number of owned capsules found matches the number requested
    if (!ownedCapsules || ownedCapsules.length !== payload.capsule_ids.length) {
      const foundIds = ownedCapsules?.map(c => c.id) || [];
      const missingIds = payload.capsule_ids.filter(id => !foundIds.includes(id));
      console.warn(`Ownership/Existence check failed for capsules. User: ${creatorUserId}, Provided: ${payload.capsule_ids}, Found: ${foundIds}, Missing/Invalid: ${missingIds}`)
      return new Response(JSON.stringify({ error: 'Una o más cápsulas seleccionadas no existen o no te pertenecen.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const validatedCapsuleIds = ownedCapsules.map(c => c.id); // Use validated IDs for recuerdo check

    // 2. Validate Recuerdo Ownership and Existence (if provided)
    if (payload.recuerdo_ids && payload.recuerdo_ids.length > 0) {
        const { data: ownedRecuerdos, error: recuerdoCheckError } = await supabaseAdmin
            .from('recuerdos')
            .select('id, capsula_id')
            .in('id', payload.recuerdo_ids)
            // Ensure recuerdos belong to one of the *validated* owned capsules
            .in('capsula_id', validatedCapsuleIds) // Check against the validated owned capsule IDs

        if (recuerdoCheckError) {
            console.error('Error checking recuerdo ownership:', recuerdoCheckError)
            throw new Error('Database error during recuerdo validation')
        }

        // Check if all provided recuerdo_ids were found and belong to the validated capsules
        const foundRecuerdoIds = new Set(ownedRecuerdos?.map(r => r.id) || [])
        const allRecuerdosValid = payload.recuerdo_ids.every(id => foundRecuerdoIds.has(id))

        if (!allRecuerdosValid || !ownedRecuerdos || ownedRecuerdos.length !== payload.recuerdo_ids.length) {
             const foundIds = ownedRecuerdos?.map(r => r.id) || [];
             const missingIds = payload.recuerdo_ids.filter(id => !foundIds.includes(id));
             console.warn(`Ownership/Existence check failed for recuerdos. User: ${creatorUserId}, Provided: ${payload.recuerdo_ids}, Found in validated capsules: ${foundIds}, Missing/Invalid: ${missingIds}`)
             return new Response(JSON.stringify({ error: 'Uno o más recuerdos seleccionados no existen o no pertenecen a las cápsulas seleccionadas.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
    }
    // --- End Validation ---

    // --- Verify User Profile Exists and Get Name ---
    const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('usuarios') // Check your public profile table
        .select('id, nombre') // Fetch name as well
        .eq('id', creatorUserId)
        .maybeSingle() // Use maybeSingle to handle null if not found

    if (profileError) {
        console.error('Error checking user profile existence:', profileError);
        throw new Error('Database error while verifying user profile.');
    }

    if (!userProfile) {
        console.error(`User profile not found in 'usuarios' table for authenticated user ID: ${creatorUserId}`);
        // Return a 403 Forbidden or 400 Bad Request, as the user exists in auth but not in the required profile table.
        return new Response(JSON.stringify({ error: 'User profile setup incomplete. Cannot create reminder.' }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    const creatorName = userProfile?.nombre ?? null; // Get creator name
    console.log(`User profile verified for ID: ${creatorUserId}, Name: ${creatorName}`);
    // --- End Profile Verification ---


    // --- Create Reminder (using CORRECT columns from refactored 'mensajes_programados') ---
    const reminderData = {
      creator_user_id: creatorUserId,
      recipient_email: payload.recipient_email,
      recipient_name: payload.recipient_name,
      delivery_method: payload.delivery_method, // Uses the ENUM type now
      scheduled_delivery_at: payload.scheduled_delivery_at, // Is timestamptz
      title: payload.title, // Use the dedicated title column
      message: payload.message, // Use the dedicated message column
      status: 'scheduled', // Default status from ENUM
      // access_token, created_at, updated_at have defaults in the DB
    }

    console.log('Attempting final insert with correct data:', JSON.stringify(reminderData, null, 2));

    // Insert into future_reminders table and retrieve the new record
    const { data: newReminder, error: reminderError } = await supabaseAdmin
      .from('future_reminders') // Revert back to the correct table name
      .insert(reminderData)
      .select('id, access_token') // Select needed fields
      .single(); // Get the single record

    // Check for errors after insert attempt
    if (reminderError) {
        console.error('Supabase insert error (final attempt):', reminderError);
        console.error('Error details (stringified, final attempt):', JSON.stringify(reminderError, null, 2));
        let userMessage = `Failed to create reminder record: ${reminderError.message || 'Unknown database error'}`;
        if (reminderError.details) userMessage += ` Details: ${reminderError.details}`;
        if (reminderError.hint) userMessage += ` Hint: ${reminderError.hint}`;
        throw new Error(userMessage);
    }

    if (!newReminder) {
        console.error('Error creating reminder: newReminder object is null or undefined after insert.');
        throw new Error('Failed to create reminder record: Insert operation did not return the expected record.');
    }

    // If we reach here, the insert was successful and we have the new reminder ID and token
    console.log('Reminder created successfully in mensajes_programados with ID:', newReminder.id);

    // --- Associate Capsules (using correct join table name) ---
    const reminderCapsulesData = payload.capsule_ids.map(capsuleId => ({
      reminder_id: newReminder.id, // Use the actual ID
      capsule_id: capsuleId,
    }))

    const { error: capsulesError } = await supabaseAdmin
      .from('future_reminder_capsules') // Revert back to the correct join table name
      .insert(reminderCapsulesData)

    if (capsulesError) {
      console.error('Error associating capsules:', capsulesError)
      // Attempt to clean up the created reminder if capsule association fails
      await supabaseAdmin.from('future_reminders').delete().match({ id: newReminder.id }) // Use correct table name
      throw new Error('Failed to associate capsules with reminder')
    }
    console.log('Capsules associated successfully.');

    // --- Associate Recuerdos (if provided, using correct join table name) ---
    if (payload.recuerdo_ids && payload.recuerdo_ids.length > 0) {
      const reminderRecuerdosData = payload.recuerdo_ids.map(recuerdoId => ({
        reminder_id: newReminder.id, // Use the actual ID
        recuerdo_id: recuerdoId,
      }))

      const { error: recuerdosError } = await supabaseAdmin
        .from('future_reminder_recuerdos') // Revert back to the correct join table name
        .insert(reminderRecuerdosData)

      if (recuerdosError) {
        console.error('Error associating recuerdos:', recuerdosError)
        // Attempt to clean up the created reminder and associated capsules if recuerdo association fails
        await supabaseAdmin.from('future_reminder_capsules').delete().match({ reminder_id: newReminder.id }) // Use correct join table name
        await supabaseAdmin.from('future_reminders').delete().match({ id: newReminder.id }) // Use correct table name
        throw new Error('Failed to associate recuerdos with reminder')
      }
      console.log('Recuerdos associated successfully.');
    }

    // --- Asociar archivos multimedia (future_reminder_files) ---
    if (payload.file_ids && Array.isArray(payload.file_ids) && payload.file_ids.length > 0) {
      // Validar que los recuerdos existen y pertenecen al usuario (opcional: puedes reforzar la validación)
      const { data: ownedFiles, error: filesCheckError } = await supabaseAdmin
        .from('recuerdos')
        .select('id, usuario_id')
        .in('id', payload.file_ids)
        .eq('usuario_id', creatorUserId);

      if (filesCheckError) {
        console.error('Error checking file ownership:', filesCheckError);
        // Intentar limpiar el recordatorio y asociaciones previas
        await supabaseAdmin.from('future_reminder_capsules').delete().match({ reminder_id: newReminder.id });
        await supabaseAdmin.from('future_reminders').delete().match({ id: newReminder.id });
        throw new Error('Database error during file validation');
      }
      const foundFileIds = ownedFiles?.map(f => f.id) || [];
      const allFilesValid = payload.file_ids.every(id => foundFileIds.includes(id));
      if (!allFilesValid || !ownedFiles || ownedFiles.length !== payload.file_ids.length) {
        const missingIds = payload.file_ids.filter(id => !foundFileIds.includes(id));
        console.warn(`Ownership/Existence check failed for files. User: ${creatorUserId}, Provided: ${payload.file_ids}, Found: ${foundFileIds}, Missing/Invalid: ${missingIds}`);
        // Intentar limpiar el recordatorio y asociaciones previas
        await supabaseAdmin.from('future_reminder_capsules').delete().match({ reminder_id: newReminder.id });
        await supabaseAdmin.from('future_reminders').delete().match({ id: newReminder.id });
        throw new Error('Uno o más archivos seleccionados no existen o no te pertenecen.');
      }
      // Insertar relaciones en future_reminder_files
      const reminderFilesData = payload.file_ids.map(fileId => ({
        future_reminder_id: newReminder.id,
        recuerdo_id: fileId,
      }));
      const { error: filesError } = await supabaseAdmin
        .from('future_reminder_files')
        .insert(reminderFilesData);
      if (filesError) {
        console.error('Error associating files:', filesError);
        // Intentar limpiar el recordatorio y asociaciones previas
        await supabaseAdmin.from('future_reminder_capsules').delete().match({ reminder_id: newReminder.id });
        await supabaseAdmin.from('future_reminders').delete().match({ id: newReminder.id });
        throw new Error('Failed to associate files with reminder');
      }
      console.log('Archivos multimedia asociados correctamente.');
    }

    // --- Send Initial Notification Email (Best Effort) ---
    if (payload.delivery_method === 'email' && payload.recipient_email) {
        console.log('Attempting to send initial notification email...');
        sendInitialNotificationEmail({ // No need to await, let it run in background
            recipient_email: payload.recipient_email,
            recipient_name: payload.recipient_name ?? null,
            creator_name: creatorName, // Use fetched creator name
            access_token: newReminder.access_token,
            scheduled_delivery_at: payload.scheduled_delivery_at,
        }).catch(emailError => {
            // Log error but don't fail the main request
            console.error('Failed to send initial notification email (non-blocking):', emailError);
        });
    }
    // --- End Initial Notification ---


    // --- Return Final Success Response ---
    return new Response(
      JSON.stringify({
        reminder_id: newReminder.id,
        access_token: newReminder.access_token,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 201, // Use 201 Created
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
