import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const VIDEO_CONVERTER_URL = Deno.env.get("VIDEO_CONVERTER_URL") || "http://video_converter_service:8000/convert";
const VIDEO_CONVERTER_AUTH_TOKEN = Deno.env.get("VIDEO_CONVERTER_AUTH_TOKEN") || "changeme";
const SUPABASE_STORAGE_BUCKET = "capsules";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function setCORSHeaders(headers: Headers) {
  headers.set("Access-Control-Allow-Origin", "*");
  headers.set("Access-Control-Allow-Methods", "POST, GET, OPTIONS");
  headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, apikey, x-client-info");
}

async function getRecuerdoByArchivo(nombreArchivo: string) {
  const { data, error } = await supabase
    .from("recuerdos")
    .select("*")
    .eq("nombre_archivo", nombreArchivo)
    .single();
  if (error || !data) {
    return { error: "No se encontró el recuerdo en la base de datos" };
  }
  return { recuerdo: data };
}

async function getPlanUsuario(userId: string) {
  const { data, error } = await supabase
    .from("usuarios")
    .select("plan")
    .eq("id", userId)
    .single();
  if (error || !data) {
    return { error: "No se encontró el usuario en la base de datos" };
  }
  return { plan: data.plan || "Gratis" };
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

  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    return new Response(JSON.stringify({ error: "JSON inválido", details: String(e) }), {
      status: 400,
      headers,
    });
  }

  // DEBUG: Devolver el body recibido para depuración
  if (body && body.__debug_echo_body) {
    return new Response(JSON.stringify({ debug_body: body }), {
      status: 200,
      headers,
    });
  }

  // Si los parámetros contienen {{record.name}}, extraer del body del evento
  let nombreArchivo = "";
  let bucket = "";
  let video_url = body.video_url;
  let video_size_mb = body.video_size_mb;
  let video_format = body.video_format;

  // Detectar si los parámetros son literales
  const isPlaceholder = (val: string) =>
    typeof val === "string" && val.includes("{{record.name}}");

  if (
    isPlaceholder(body.video_url) ||
    isPlaceholder(body.video_format) ||
    isPlaceholder(body.video_size_mb)
  ) {
    // Supabase envía el evento completo en el body
    // Buscar en body.record o body.new
    const record = body.record || body.new;
    if (record) {
      nombreArchivo = record.name;
      bucket = record.bucket_id;
      video_url = `https://fyauxlcfktjegtqurffj.supabase.co/storage/v1/object/public/${bucket}/${nombreArchivo}`;
      video_size_mb = record.size ? record.size / (1024 * 1024) : undefined;
      video_format = nombreArchivo;
    } else {
      return new Response(JSON.stringify({ error: "No se encontró el objeto record/new en el evento" }), {
        status: 400,
        headers,
      });
    }
  } else {
    // Extraer nombre de archivo de video_url o video_format
    if (body.video_url) {
      const parts = body.video_url.split("/");
      nombreArchivo = parts[parts.length - 1];
    } else if (body.video_format) {
      nombreArchivo = body.video_format;
    }
  }

  if (!nombreArchivo) {
    return new Response(JSON.stringify({ error: "No se pudo determinar el nombre del archivo" }), {
      status: 400,
      headers,
    });
  }

  // Buscar el recuerdo en la base de datos usando el cliente oficial
  const { recuerdo, error: errorRecuerdo } = await getRecuerdoByArchivo(nombreArchivo);
  if (errorRecuerdo) {
    return new Response(JSON.stringify({ error: errorRecuerdo }), {
      status: 400,
      headers,
    });
  }

  // Obtener user_id y plan usando el cliente oficial
  const user_id = recuerdo.usuario_id;
  const { plan, error: errorPlan } = await getPlanUsuario(user_id);
  if (errorPlan) {
    return new Response(JSON.stringify({ error: errorPlan }), {
      status: 400,
      headers,
    });
  }

  // Construir payload para el microservicio
  const payload = {
    user_id,
    plan,
    video_url,
    video_size_mb,
    video_format,
    current_video_count: 0, // Si se requiere, se puede consultar en la base
    current_storage_mb: 0   // Si se requiere, se puede consultar en la base
  };

  // Reenviar al microservicio de conversión
  try {
    const converterRes = await fetch(VIDEO_CONVERTER_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-auth-token": VIDEO_CONVERTER_AUTH_TOKEN,
      },
      body: JSON.stringify(payload),
    });

    const converterJson = await converterRes.json();

    return new Response(JSON.stringify(converterJson), {
      status: converterRes.status,
      headers,
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: "Error llamando al microservicio de conversión", details: String(e) }), {
      status: 500,
      headers,
    });
  }
});
