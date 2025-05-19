/// <reference types="https://esm.sh/v135/@supabase/functions-js@2.3.1/src/edge-runtime.d.ts" />

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';

console.log('v2: Add Direct Recording function started'); // Added v2

// Define the expected structure of the request body (form data)
interface RecordingData {
  fileBlob: Blob; // The recorded audio/video blob
  fileName: string; // Suggested filename (e.g., recording-timestamp.webm)
  fileType: 'audio' | 'video'; // Explicitly provided type
  latitude?: string; // Optional latitude as string
  longitude?: string; // Optional longitude as string
  // Optional fields for the recuerdo itself (could be added later if needed)
  // title?: string;
  // description?: string;
  // realDate?: string;
}

serve(async (req: Request) => {
  console.log(`v2: Request received - Method: ${req.method}`); // Added v2 log
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    console.log("v2: Handling OPTIONS request"); // Added v2 log
    return new Response('ok', { headers: corsHeaders });
  }
  console.log("v2: Handling non-OPTIONS request"); // Added v2 log

  try {
    console.log("v2: Entering try block..."); // Added v2 log
    // 1. Initialize Supabase Client
    console.log("v2: Checking environment variables..."); // Added v2 log
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    console.log(`v2: SUPABASE_URL is ${supabaseUrl ? 'present' : 'MISSING!'}`); // Added v2 log + check
    console.log(`v2: SUPABASE_ANON_KEY is ${supabaseAnonKey ? 'present' : 'MISSING!'}`); // Added v2 log + check

    if (!supabaseUrl || !supabaseAnonKey) {
      console.error("v2: CRITICAL ERROR - Missing Supabase environment variables!"); // Added v2 log
      return new Response(JSON.stringify({ error: 'Internal server configuration error - missing env vars' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log("v2: Environment variables seem OK."); // Added v2 log

    console.log("v2: Initializing Supabase client..."); // Restored log
    const supabaseClient = createClient(
      supabaseUrl, // Use checked variables
      supabaseAnonKey, // Use checked variables
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } } // Restore using incoming auth header
    );
    console.log("v2: Supabase client initialized."); // Restored log

    // 2. Get User Data (Should work again now)
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User error:', userError);
      return new Response(JSON.stringify({ error: 'User not authenticated' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = user.id;
    console.log(`v2: User authenticated: ${userId}`); // Added v2 prefix

    // 3. Parse Form Data
    console.log("v2: Parsing form data..."); // Added v2 prefix
    const formData = await req.formData();
    const fileBlob = formData.get('fileBlob') as Blob | null;
    const fileName = formData.get('fileName') as string | null;
    const fileType = formData.get('fileType') as 'audio' | 'video' | null;
    const latitudeStr = formData.get('latitude') as string | null;
    const longitudeStr = formData.get('longitude') as string | null;

    if (!fileBlob || !fileName || !fileType) {
      return new Response(JSON.stringify({ error: 'Missing required data: fileBlob, fileName, or fileType' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

     if (fileType !== 'audio' && fileType !== 'video') {
         return new Response(JSON.stringify({ error: 'Invalid fileType. Only audio or video allowed.' }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
    console.log("v2: Form data parsed successfully."); // Added v2 prefix

    // Parse coordinates if provided
    let latitude: number | null = null;
    let longitude: number | null = null;
    if (latitudeStr && longitudeStr) {
        const parsedLat = parseFloat(latitudeStr);
        const parsedLng = parseFloat(longitudeStr);
        if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
            latitude = parsedLat;
            longitude = parsedLng;
            console.log("Parsed location:", { latitude, longitude });
        } else {
            console.warn("Received invalid latitude/longitude strings:", latitudeStr, longitudeStr);
        }
    }
    console.log("v2: Coordinates parsed (if provided)."); // Added v2 prefix

    // 4. Create a New Capsule Automatically
    const now = new Date();
    const defaultCapsuleTitle = `Grabación ${now.toLocaleDateString()} ${now.toLocaleTimeString()}`;
    console.log("v2: Attempting to create capsule..."); // Added v2 prefix
    const { data: newCapsule, error: capsuleError } = await supabaseClient
      .from('capsulas')
      .insert({
        usuario_id: userId,
        titulo: defaultCapsuleTitle,
        descripcion: 'Grabado directamente desde la aplicación.',
        tipo: 'grabacion', // Use a specific type for recorded capsules
        publica: false, // Default to private
      })
      .select('id')
      .single();

    if (capsuleError) {
      console.error('Error creating capsule for recording:', capsuleError);
      return new Response(JSON.stringify({ error: 'Failed to create capsule for recording', details: capsuleError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const newCapsuleId = newCapsule.id;
    console.log('v2: Created new capsule successfully:', newCapsuleId); // Added v2 prefix


    // 5. Upload File Blob to Supabase Storage under the new capsule
    const filePath = `${userId}/${newCapsuleId}/${fileName}`; // Use user ID and new capsule ID
    console.log(`v2: Attempting to upload file to bucket 'capsules' at path: ${filePath}`); // Added v2 prefix
    const { error: uploadError } = await supabaseClient.storage
      .from('capsules') // Use the 'capsules' bucket
      .upload(filePath, fileBlob, {
        cacheControl: '3600',
        upsert: false,
        contentType: fileBlob.type // Pass content type from blob
      });
    console.log("v2: File upload attempt finished."); // Added v2 prefix

    if (uploadError) {
      console.error('v2: Error uploading recorded file:', uploadError); // Added v2 prefix
      // Attempt to delete the created capsule if upload fails? Or leave it empty? Let's leave it for now.
      return new Response(JSON.stringify({ error: 'Failed to upload recorded file', details: uploadError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    console.log('v2: Recorded file uploaded successfully to:', filePath); // Added v2 prefix

    // Construct the public URL
    console.log("v2: Attempting to get public URL..."); // Added v2 prefix
    const { data: urlData } = supabaseClient.storage.from('capsules').getPublicUrl(filePath);
    const publicUrl = urlData?.publicUrl;
    console.log("v2: Public URL obtained (or not):", publicUrl); // Added v2 prefix

    if (!publicUrl) { // Re-establish the if block correctly
         console.error('v2: Could not get public URL for uploaded recording'); // Added v2 prefix
         // Consider deleting the uploaded file and capsule?
         return new Response(JSON.stringify({ error: 'Failed to get public URL for uploaded recording' }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    } // Correct placement of the closing brace

    // 6. Insert Recuerdo Record into Database (Marked as Favorite)
    const recuerdoToInsert = {
      usuario_id: userId,
      capsula_id: newCapsuleId, // Link to the newly created capsule
      tipo: fileType,
      url_archivo: publicUrl,
      nombre_archivo: fileName,
      es_favorito: true, // Mark as favorite automatically
      titulo_personalizado: `Grabación ${fileType === 'audio' ? 'de Audio' : 'de Video'}`, // Default title
      descripcion: `Grabado el ${now.toLocaleString()}`, // Default description
      fecha_real: now.toISOString().split('T')[0], // Use current date as real date
      // Default values for other potentially non-null fields
      // mejorado_por_IA: false, // Rely on DB default
      // limpio_por_IA: false, // Rely on DB default
      ia_acceso: false,
      ubicacion_manual: latitude !== null && longitude !== null, // Mark as manual if location was provided
      anclado: false,
      latitud: latitude, // Add latitude if available
      longitud: longitude, // Add longitude if available
    };
    console.log("v2: Recuerdo object prepared:", JSON.stringify(recuerdoToInsert, null, 2)); // Added v2 prefix

    console.log("v2: Attempting to insert recuerdo into database..."); // Added v2 prefix
    const { data: newRecuerdo, error: insertError } = await supabaseClient
      .from('recuerdos')
      .insert(recuerdoToInsert)
      .select()
      .single();
    console.log("v2: Database insert attempt finished."); // Added v2 prefix

    if (insertError) {
      console.error('v2: Error inserting recorded recuerdo:', insertError); // Added v2 prefix
       // Consider deleting the uploaded file and capsule if DB insert fails
       await supabaseClient.storage.from('capsules').remove([filePath]); // Use 'capsules' bucket
       await supabaseClient.from('capsulas').delete().eq('id', newCapsuleId);
       console.log('v2: Rolled back file upload and capsule creation due to DB error'); // Added v2 prefix
      return new Response(JSON.stringify({ error: 'Failed to save recorded recuerdo details', details: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('v2: Recorded Recuerdo created successfully:', newRecuerdo.id); // Added v2 prefix
    console.log("v2: Function finished successfully."); // Added v2 prefix

    // 7. Return Success Response
    return new Response(JSON.stringify({ success: true, recuerdo: newRecuerdo, capsula: newCapsule }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201, // 201 Created
    });

  } catch (error: any) {
    console.error('v2: Unhandled error in add-direct-recording:', error); // Added v2 prefix
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: 'Internal server error', details: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
