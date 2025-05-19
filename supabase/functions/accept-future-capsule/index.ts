import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/cors.ts";
import { Database } from "../_shared/database.types.ts";

// Entrada: { reminder_id: string }
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient<Database>(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { reminder_id } = await req.json();
    if (!reminder_id) {
      return new Response(JSON.stringify({ error: "reminder_id requerido" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 1. Obtener usuario autenticado
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Falta header de autorización");
    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "No autenticado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const userId = user.id;

    // 2. Obtener datos del recordatorio y cápsula original
    const { data: reminder, error: reminderError } = await supabaseAdmin
      .from("future_reminders")
      .select("id, capsula_id, status, recipient_email, opened_by")
      .eq("id", reminder_id)
      .single();

    if (reminderError || !reminder) {
      return new Response(JSON.stringify({ error: "Recordatorio no encontrado" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Validar que el recordatorio esté disponible para abrirse
    if (reminder.status !== "available") {
      return new Response(JSON.stringify({ error: "La cápsula aún no está disponible para abrirse" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // 3. Verificar si ya fue abierto por este usuario
    if (reminder.opened_by && Array.isArray(reminder.opened_by) && reminder.opened_by.includes(userId)) {
      return new Response(JSON.stringify({ message: "Ya tienes la cápsula en tu dashboard" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // 4. Clonar la cápsula y recuerdos para el usuario receptor
    // 4.1 Obtener datos de la cápsula original
    const { data: originalCapsule, error: capsuleError } = await supabaseAdmin
      .from("capsulas")
      .select("*")
      .eq("id", reminder.capsula_id)
      .single();

    if (capsuleError || !originalCapsule) {
      return new Response(JSON.stringify({ error: "Cápsula original no encontrada" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // 4.2 Crear nueva cápsula para el usuario receptor
    const newCapsule = {
      ...originalCapsule,
      id: undefined,
      usuario_id: userId,
      anclada: false,
      fecha_creacion: new Date().toISOString(),
      // Omitir campos que no deben copiarse
    };
    const { data: insertedCapsule, error: insertCapsuleError } = await supabaseAdmin
      .from("capsulas")
      .insert(newCapsule)
      .select("id")
      .single();

    if (insertCapsuleError || !insertedCapsule) {
      return new Response(JSON.stringify({ error: "Error al crear cápsula para receptor" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // 4.3 Clonar recuerdos asociados
    const { data: recuerdos, error: recuerdosError } = await supabaseAdmin
      .from("recuerdos")
      .select("*")
      .eq("capsula_id", originalCapsule.id);

    if (recuerdosError) {
      return new Response(JSON.stringify({ error: "Error al obtener recuerdos" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    if (recuerdos && recuerdos.length > 0) {
      const nuevosRecuerdos = recuerdos.map((r) => ({
        ...r,
        id: undefined,
        capsula_id: insertedCapsule.id,
        usuario_id: userId,
        fecha_subida: new Date().toISOString(),
        es_favorito: false,
        anclado: false,
      }));
      const { error: insertRecuerdosError } = await supabaseAdmin
        .from("recuerdos")
        .insert(nuevosRecuerdos);

      if (insertRecuerdosError) {
        return new Response(JSON.stringify({ error: "Error al clonar recuerdos" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        });
      }
    }

    // 5. Marcar la cápsula como abierta por este usuario (agregar userId a opened_by)
    const openedBy = Array.isArray(reminder.opened_by) ? [...reminder.opened_by, userId] : [userId];
    await supabaseAdmin
      .from("future_reminders")
      .update({ opened_by: openedBy })
      .eq("id", reminder_id);

    return new Response(JSON.stringify({ message: "Cápsula transferida correctamente", new_capsule_id: insertedCapsule.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
