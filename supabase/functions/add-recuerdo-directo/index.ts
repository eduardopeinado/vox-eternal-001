/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.3.1/src/edge-runtime.d.ts" />

import { serve, ServerRequest } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts'; // Reverted back to .ts extension

console.log('Add Recuerdo Directo function started');

// Define the expected structure of the request body (form data)
interface RecuerdoData {
  file: File;
  capsuleId?: string; // ID of existing capsule, or 'new' to create one
  createCapsuleTitle?: string; // Title if creating a new capsule
  createCapsuleDescription?: string; // Description if creating a new capsule
  markAsFavorite: boolean;
  title?: string; // Optional custom title for the recuerdo
  description?: string; // Optional description for the recuerdo
  realDate?: string; // Optional real date for the recuerdo (YYYY-MM-DD)
}

serve(async (req: Request) => { // Add type Request for req
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Initialize Supabase Client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // 2. Get User Data
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;

    // 3. Parse Form Data
    // Supabase Edge Functions expect form-data for file uploads
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const capsuleIdInput = formData.get('capsuleId') as string | null; // 'uuid', 'new', or null/undefined
    const createCapsuleTitle = formData.get('createCapsuleTitle') as string | null;
    const createCapsuleDescription = formData.get('createCapsuleDescription') as string | null;
    const markAsFavorite = formData.get('markAsFavorite') === 'true'; // FormData values are strings
    const title = formData.get('title') as string | null;
    const description = formData.get('description') as string | null;
    const realDateStr = formData.get('realDate') as string | null; // Expecting YYYY-MM-DD

    if (!file) {
      return new Response(JSON.stringify({ error: 'File is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Determine file type (simple check based on extension/mime type)
    let fileType: 'audio' | 'video' | 'other' = 'other';
    if (file.type.startsWith('audio/')) {
        fileType = 'audio';
    } else if (file.type.startsWith('video/')) {
        fileType = 'video';
    } else {
         return new Response(JSON.stringify({ error: 'Invalid file type. Only audio or video allowed.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    let targetCapsuleId: string | null = null;

    // 4. Handle Capsule Logic
    if (capsuleIdInput === 'new') {
      // Create a new capsule
      const { data: newCapsule, error: capsuleError } = await supabaseClient
        .from('capsulas')
        .insert({
          usuario_id: userId,
          titulo: createCapsuleTitle || `Nueva Cápsula ${new Date().toLocaleDateString()}`, // Default title
          descripcion: createCapsuleDescription || '',
          tipo: 'predeterminado', // Or determine based on content?
          publica: false, // Default to private
        })
        .select('id')
        .single();

      if (capsuleError) {
        console.error('Error creating capsule:', capsuleError);
        return new Response(JSON.stringify({ error: 'Failed to create capsule', details: capsuleError.message }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      targetCapsuleId = newCapsule.id;
      console.log('Created new capsule:', targetCapsuleId);

    } else if (capsuleIdInput) {
       // Validate existing capsule ID belongs to user (optional, RLS should handle this on insert)
       // For extra safety, you could query the capsule here.
       targetCapsuleId = capsuleIdInput;
       console.log('Using existing capsule:', targetCapsuleId);
    } else {
         return new Response(JSON.stringify({ error: 'Capsule selection (existing ID or "new") is required' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }


    // 5. Upload File to Supabase Storage
    const filePath = `${userId}/${targetCapsuleId}/${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabaseClient.storage
      .from('recuerdos') // Assuming your bucket is named 'recuerdos'
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      });

    if (uploadError) {
      console.error('Error uploading file:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload file', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('File uploaded to:', filePath);

    // Construct the public URL (adjust if you have custom domain/CDN)
    const { data: urlData } = supabaseClient.storage.from('recuerdos').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;

    if (!publicUrl) {
         console.error('Could not get public URL for uploaded file');
         // Consider deleting the uploaded file if we can't get URL?
         return new Response(JSON.stringify({ error: 'Failed to get public URL for uploaded file' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }

    // 6. Insert Recuerdo Record into Database
    const recuerdoToInsert = {
      usuario_id: userId,
      capsula_id: targetCapsuleId,
      tipo: fileType,
      url_archivo: publicUrl, // Store the public URL
      nombre_archivo: file.name,
      es_favorito: markAsFavorite,
      titulo_personalizado: title || null,
      descripcion: description || null,
      fecha_real: realDateStr || null, // Store date string or null
      // Default values for other potentially non-null fields if needed
      mejorado_por_IA: false,
      limpio_por_IA: false,
      ia_acceso: false,
      ubicacion_manual: false,
      anclado: false,
    };

    const { data: newRecuerdo, error: insertError } = await supabaseClient
      .from('recuerdos')
      .insert(recuerdoToInsert)
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting recuerdo:', insertError);
       // Consider deleting the uploaded file if DB insert fails
       await supabaseClient.storage.from('recuerdos').remove([filePath]);
       console.log('Rolled back file upload due to DB error');
      return new Response(JSON.stringify({ error: 'Failed to save recuerdo details', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Recuerdo created successfully:', newRecuerdo.id);

    // 7. Return Success Response
    return new Response(JSON.stringify({ success: true, recuerdo: newRecuerdo }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error: any) { // Add type any for error
    console.error('Unhandled error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
