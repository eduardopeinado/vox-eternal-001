import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_STORAGE_BUCKET = "capsules";

function setCORSHeaders(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
}

async function logMejoraIA({ usuario_id, recuerdo_id, url_antes, url_despues }: {
  usuario_id?: string;
  recuerdo_id?: string;
  url_antes?: string;
  url_despues?: string;
}): Promise<{ error?: any }> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return { error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas en el entorno de Edge Functions." };
  }
  const res = await fetch(`${SUPABASE_URL}/rest/v1/mejoras_ia_log`, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_SERVICE_ROLE_KEY,
      "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
      "Prefer": "return=representation"
    },
    body: JSON.stringify({
      usuario_id,
      recuerdo_id,
      tipo: "foto",
      resultado: "aceptada",
      url_antes,
      url_despues
    })
  });
  if (!res.ok) {
    const errorText = await res.text();
    return { error: `Error al insertar en mejoras_ia_log: ${res.status} - ${errorText}` };
  }
  return {};
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

  let body: { img?: string; scale?: number; version?: string; usuario_id?: string; recuerdo_id?: string } = {};
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON inválido", details: String(e) }), {
      status: 400,
      headers,
    });
  }

  if (!body.img) {
    return new Response(JSON.stringify({ error: "Falta el parámetro 'img' (URL de la imagen)" }), {
      status: 400,
      headers,
    });
  }

  // Construir input para Replicate según el schema
  const replicateInput: Record<string, unknown> = {
    img: body.img,
    scale: typeof body.scale === "number" ? body.scale : 2,
    version: typeof body.version === "string" ? body.version : "v1.4"
  };

  try {
    // Obtener variables de entorno de forma segura
    const REPLICATE_API_TOKEN = Deno.env.get("REPLICATE_API_TOKEN");
    const REPLICATE_MODEL_VERSION = "6129309904ce4debfde78de5c209bce0022af40e197e132f08be8ccce3050393";
    if (!REPLICATE_API_TOKEN) {
      return new Response(JSON.stringify({ error: "REPLICATE_API_TOKEN no está definida en el entorno de Edge Functions." }), {
        status: 500,
        headers,
      });
    }

    // 1. Lanzar la predicción
    const predictionRes = await fetch("https://api.replicate.com/v1/predictions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        version: REPLICATE_MODEL_VERSION,
        input: replicateInput
      })
    });

    const prediction = await predictionRes.json();

    if (!predictionRes.ok || !prediction?.id) {
      return new Response(JSON.stringify({ error: "Error al crear predicción en Replicate", details: prediction }), {
        status: 500,
        headers,
      });
    }

    // 2. Polling hasta que la predicción esté lista
    let status = prediction.status;
    let output = prediction.output;
    let replicateRaw = prediction;
    let pollCount = 0;
    const maxPolls = 30; // ~30s máximo
    const pollInterval = 1000; // 1s

    while (status === "starting" || status === "processing") {
      await new Promise(res => setTimeout(res, pollInterval));
      pollCount++;
      const pollRes = await fetch(`https://api.replicate.com/v1/predictions/${prediction.id}`, {
        headers: {
          "Authorization": `Bearer ${REPLICATE_API_TOKEN}`,
          "Content-Type": "application/json"
        }
      });
      const pollJson = await pollRes.json();
      status = pollJson.status;
      output = pollJson.output;
      replicateRaw = pollJson;
      if (status === "succeeded" || status === "failed" || pollCount >= maxPolls) break;
    }

    if (status !== "succeeded" || !output) {
      return new Response(JSON.stringify({ error: "La mejora IA no se completó correctamente", details: replicateRaw }), {
        status: 500,
        headers,
      });
    }

    // output puede ser string (URL) o array
    let improvedUrl = null;
    if (typeof output === "string") {
      improvedUrl = output;
    } else if (Array.isArray(output)) {
      improvedUrl = output[0] || null;
    }

    if (!improvedUrl) {
      return new Response(JSON.stringify({ error: "No se obtuvo URL de imagen mejorada" }), {
        status: 500,
        headers,
      });
    }

    // 3. Descargar la imagen mejorada
    const improvedImgRes = await fetch(improvedUrl);
    if (!improvedImgRes.ok) {
      return new Response(JSON.stringify({ error: "No se pudo descargar la imagen mejorada", details: await improvedImgRes.text() }), {
        status: 500,
        headers,
      });
    }
    const imgBuffer = new Uint8Array(await improvedImgRes.arrayBuffer());

    // Detectar el tipo de imagen (por extensión o header)
    let contentType = improvedImgRes.headers.get("content-type") || "image/jpeg";
    let ext = "jpg";
    if (contentType.includes("png")) ext = "png";
    if (contentType.includes("jpeg")) ext = "jpg";
    if (contentType.includes("webp")) ext = "webp";

    // 4. Subir a Supabase Storage
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(JSON.stringify({ error: "SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no configuradas" }), {
        status: 500,
        headers,
      });
    }
    // Nombre único: recuerdoID_mejorado_TIMESTAMP.ext
    const now = Date.now();
    const recuerdoId = body.recuerdo_id || "sin_id";
    const fileName = `${recuerdoId}_mejorado_${now}.${ext}`;
    const storagePath = `${fileName}`;

    const uploadRes = await fetch(`${SUPABASE_URL}/storage/v1/object/${SUPABASE_STORAGE_BUCKET}/${storagePath}`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=31536000"
      },
      body: imgBuffer
    });

    if (!uploadRes.ok) {
      return new Response(JSON.stringify({ error: "Error al subir la imagen mejorada a Supabase Storage", details: await uploadRes.text() }), {
        status: 500,
        headers,
      });
    }

    // 5. Actualizar la tabla recuerdos con la ruta relativa
    const updateRes = await fetch(`${SUPABASE_URL}/rest/v1/recuerdos?id=eq.${recuerdoId}`, {
      method: "PATCH",
      headers: {
        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "apikey": SUPABASE_SERVICE_ROLE_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
      },
      body: JSON.stringify({
        url_mejorado: storagePath,
        mejorado_por_ia: true
      })
    });

    if (!updateRes.ok) {
      return new Response(JSON.stringify({ error: "Error al actualizar la tabla recuerdos", details: await updateRes.text() }), {
        status: 500,
        headers,
      });
    }

    // 6. Auditar la mejora
    const logResult = await logMejoraIA({
      usuario_id: body.usuario_id,
      recuerdo_id: body.recuerdo_id,
      url_antes: body.img,
      url_despues: `${SUPABASE_STORAGE_BUCKET}/${storagePath}`
    });

    if (logResult.error) {
      return new Response(JSON.stringify({
        error: "Error al auditar mejora IA",
        details: logResult.error,
        improved_img: `${SUPABASE_STORAGE_BUCKET}/${storagePath}`,
        replicate_raw: replicateRaw
      }), {
        status: 500,
        headers,
      });
    }

    // 7. Devolver la URL pública de Supabase Storage
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${SUPABASE_STORAGE_BUCKET}/${storagePath}`;

    return new Response(JSON.stringify({
      improved_img: publicUrl,
      replicate_raw: replicateRaw
    }), {
      status: 200,
      headers,
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: "Error llamando a Replicate o subiendo a Storage", details: String(e) }), {
      status: 500,
      headers,
    });
  }
});
