/**
 * Nota: Este archivo usa APIs de Deno (como Deno.env.get) que no son compatibles con Node.js ni con el editor TS estándar.
 * Estos errores de tipo pueden aparecer en el editor, pero no afectan la ejecución en Supabase Edge Functions,
 * que sí soporta Deno y estas APIs.
 * 
 * Por favor, ignora los errores de tipo en desarrollo local.
 */

 // @deno-types="https://deno.land/std@0.168.0/http/server.d.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


// Corregir fetch para que use la URL correcta y no localhost
// Revisar que no haya variables o constantes que usen localhost

const SUPABASE_URL = Deno.env?.get ? Deno.env.get("SUPABASE_URL") : process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env?.get ? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") : process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const VOICEFIXER_URL = Deno.env?.get ? Deno.env.get("VOICEFIXER_URL") : process.env.VOICEFIXER_URL || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
// Verificación y log de variables de entorno críticas
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !VOICEFIXER_URL) {
  console.error("Faltan variables de entorno críticas:",
    { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOICEFIXER_URL }
  );
  throw new Error("Faltan variables de entorno críticas para la función edge. Asegúrate de definir VOICEFIXER_URL en el entorno de Supabase.");
} else {
  console.log("Variables de entorno cargadas correctamente:",
    { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, VOICEFIXER_URL }
  );
}

function setCORSHeaders(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
}

async function downloadFileFromStorage(path: string): Promise<Uint8Array> {
  const { data, error } = await supabase.storage.from("capsules").download(path);
  if (error || !data) {
    throw new Error(`Error descargando archivo desde Storage: ${error?.message || "Archivo no encontrado"}`);
  }
  return new Uint8Array(await data.arrayBuffer());
}

async function uploadFileToStorage(path: string, fileData: Uint8Array, contentType: string) {
  const { error } = await supabase.storage.from("capsules").upload(path, fileData, {
    contentType,
    upsert: true,
  });
  if (error) {
    throw new Error(`Error subiendo archivo a Storage: ${error.message}`);
  }
}

async function updateRecuerdoWithImprovedAudio(recuerdoId: string, improvedPath: string) {
  const { error } = await supabase
    .from("recuerdos")
    .update({
      url_mejorado: improvedPath,
      mejorado_por_ia: true,
      tipo_mejora_ia: "audio",
      fecha_mejora_ia: new Date().toISOString(),
    })
    .eq("id", recuerdoId);
  if (error) {
    throw new Error(`Error actualizando recuerdo en DB: ${error.message}`);
  }
}

async function logImprovement(recuerdoId: string, userId: string, originalUrl: string, improvedUrl: string) {
  const { error } = await supabase.from("mejoras_ia_log").insert({
    usuario_id: userId,
    recuerdo_id: recuerdoId,
    tipo: "audio",
    fecha: new Date().toISOString(),
    resultado: "aceptada",
    url_antes: originalUrl,
    url_despues: improvedUrl,
  });
  if (error) {
    console.error("Error registrando log de mejora IA:", error.message);
  }
}

serve(async (req: Request) => {
  const { method } = req;
  const headers = new Headers();
  setCORSHeaders(headers);

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  if (method !== "POST") {
    return new Response(JSON.stringify({ error: "Método no permitido" }), {
      status: 405,
      headers,
    });
  }

  try {
    const body = await req.json();
    const { recuerdo_id } = body;

    if (!recuerdo_id) {
      console.error("Falta el parámetro 'recuerdo_id'");
      return new Response(JSON.stringify({ error: "Falta el parámetro 'recuerdo_id'" }), {
        status: 400,
        headers,
      });
    }

    // Obtener el recuerdo para descargar el archivo original
    const { data: recuerdo, error: recuerdoError } = await supabase
      .from("recuerdos")
      .select("id, usuario_id, url_archivo")
      .eq("id", recuerdo_id)
      .single();

    if (recuerdoError || !recuerdo) {
      console.error("Recuerdo no encontrado:", recuerdoError);
      return new Response(JSON.stringify({ error: "Recuerdo no encontrado" }), {
        status: 404,
        headers,
      });
    }

    // Descargar archivo original desde Storage
    let originalFileData;
    try {
      originalFileData = await downloadFileFromStorage(recuerdo.url_archivo);
      console.log("Archivo original descargado, tamaño:", originalFileData.length);
    } catch (err) {
      console.error("Error descargando archivo desde Storage:", err);
      return new Response(JSON.stringify({ error: "Error descargando archivo desde Storage", detail: String(err) }), {
        status: 500,
        headers,
      });
    }

    // Detectar extensión del archivo original
    const originalExt = recuerdo.url_archivo.split('.').pop()?.toLowerCase() || 'wav';

    // Si el archivo es m4a, convertir a mp3 temporalmente para VoiceFixer
    let fileToSendData = originalFileData;
    let fileToSendType = "audio/wav";
    let fileNameForVoiceFixer = "input_audio.wav";

    if (originalExt === "m4a") {
      // Enviar el archivo m4a tal cual, con el tipo y nombre correctos
      fileToSendType = "audio/mp4"; // o "audio/x-m4a" si VoiceFixer lo requiere
      fileNameForVoiceFixer = "input_audio.m4a";
      // No cambiar el contenido ni mostrar advertencia
    }

    // Enviar archivo al microservicio VoiceFixer
    const formData = new FormData();
    const blob = new Blob([fileToSendData], { type: fileToSendType });
    formData.append("file", blob, fileNameForVoiceFixer);

    let denoiseRes;
    try {
      const voicefixerUrl = `${VOICEFIXER_URL}/denoise`;
      console.log("URL a VoiceFixer:", voicefixerUrl);
      denoiseRes = await fetch(voicefixerUrl, {
        method: "POST",
        body: formData,
        headers: {
          "x-api-key": "vf_2025_secret_01"
        }
      });
      console.log("Respuesta recibida del microservicio VoiceFixer, status:", denoiseRes.status);
    } catch (err) {
      console.error("Error llamando al microservicio VoiceFixer:", err);
      return new Response(JSON.stringify({ error: "Error llamando al microservicio VoiceFixer", detail: String(err) }), {
        status: 500,
        headers,
      });
    }

    if (!denoiseRes.ok) {
      const err = await denoiseRes.text();
      console.error("Respuesta no OK del microservicio VoiceFixer:", err);
      return new Response(
        JSON.stringify({ error: "Error en microservicio", detail: err }),
        { status: 500, headers }
      );
    }

    // Obtener archivo mejorado como Uint8Array
    const improvedBlob = await denoiseRes.blob();
    const improvedArrayBuffer = await improvedBlob.arrayBuffer();
    const improvedFileData = new Uint8Array(improvedArrayBuffer);
    console.log("Archivo mejorado recibido, tamaño:", improvedFileData.length);

    // Validar archivo mejorado antes de subir
    if (!improvedFileData || improvedFileData.length < 1000) {
      console.error("Archivo mejorado inválido o demasiado pequeño:", improvedFileData.length);
      return new Response(JSON.stringify({ error: "Archivo mejorado inválido o demasiado pequeño", size: improvedFileData.length }), {
        status: 422,
        headers,
      });
    }

    // Definir ruta para archivo mejorado
    // Guardar siempre como mp3 para archivos de audio mejorados
    const ext = "mp3";
    const folder = recuerdo.url_archivo.includes('/') ? recuerdo.url_archivo.split('/').slice(0, -1).join('/') : '';
    const improvedFileName = `mejorado_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${ext}`;
    const improvedPath = folder ? `${folder}/${improvedFileName}` : improvedFileName;
    console.log("Ruta para archivo mejorado:", improvedPath);

    // Subir archivo mejorado a Storage
    try {
      await uploadFileToStorage(improvedPath, improvedFileData, "audio/mpeg");
      console.log("Archivo mejorado subido a Storage");
    } catch (err) {
      console.error("Error subiendo archivo mejorado a Storage:", err);
      return new Response(JSON.stringify({ error: "Error subiendo archivo mejorado a Storage", detail: String(err) }), {
        status: 500,
        headers,
      });
    }

    // Actualizar DB con la ruta mejorada
    try {
      await updateRecuerdoWithImprovedAudio(recuerdo_id, improvedPath);
      console.log("Base de datos actualizada con archivo mejorado");
    } catch (err) {
      console.error("Error actualizando DB con archivo mejorado:", err);
      return new Response(JSON.stringify({ error: "Error actualizando DB con archivo mejorado", detail: String(err) }), {
        status: 500,
        headers,
      });
    }

    // Registrar log de mejora IA
    try {
      await logImprovement(recuerdo_id, recuerdo.usuario_id, recuerdo.url_archivo, improvedPath);
      console.log("Log de mejora IA registrado");
    } catch (err) {
      console.error("Error registrando log de mejora IA:", err);
      // No bloqueamos la respuesta por error en log
    }

    // Responder con la info actualizada
    return new Response(
      JSON.stringify({
        recuerdo_id,
        url_mejorado: improvedPath,
      }),
      { status: 200, headers }
    );
  } catch (e) {
    console.error("Error procesando mejora IA:", e);
    return new Response(
      JSON.stringify({ error: "Error procesando mejora IA", detail: String(e) }),
      { status: 500, headers }
    );
  }
});
