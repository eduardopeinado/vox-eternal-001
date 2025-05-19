import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req: Request) => {
  try {
    const { user_id, friend_id, action } = await req.json();

    if (!user_id || !friend_id || !action) {
      return new Response(JSON.stringify({ error: "Missing parameters" }), { status: 400 });
    }

    switch (action) {
      case "send_request":
        // Insert a new friendship request with estado 'pendiente'
        {
          const { data, error } = await supabase
            .from("amistades")
            .insert([{ usuario_id: user_id, amigo_id: friend_id, estado: "pendiente" }])
            .select()
            .single();
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          }
          return new Response(JSON.stringify({ message: "Solicitud enviada", friendship: data }), { status: 200 });
        }
      case "accept_request":
        // Update estado to 'aceptado' where usuario_id = friend_id and amigo_id = user_id and estado = 'pendiente'
        {
          const { data, error } = await supabase
            .from("amistades")
            .update({ estado: "aceptado" })
            .eq("usuario_id", friend_id)
            .eq("amigo_id", user_id)
            .eq("estado", "pendiente")
            .select()
            .single();
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          }
          return new Response(JSON.stringify({ message: "Solicitud aceptada", friendship: data }), { status: 200 });
        }
      case "reject_request":
        // Delete the friendship request where usuario_id = friend_id and amigo_id = user_id and estado = 'pendiente'
        {
          const { error } = await supabase
            .from("amistades")
            .delete()
            .eq("usuario_id", friend_id)
            .eq("amigo_id", user_id)
            .eq("estado", "pendiente");
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          }
          return new Response(JSON.stringify({ message: "Solicitud rechazada" }), { status: 200 });
        }
      case "remove_friend":
        // Delete the friendship where (usuario_id = user_id and amigo_id = friend_id) or vice versa and estado = 'aceptado'
        {
          const { error } = await supabase
            .from("amistades")
            .delete()
            .or(
              `(and(usuario_id.eq.${user_id},amigo_id.eq.${friend_id}),and(usuario_id.eq.${friend_id},amigo_id.eq.${user_id}))`
            )
            .eq("estado", "aceptado");
          if (error) {
            return new Response(JSON.stringify({ error: error.message }), { status: 400 });
          }
          return new Response(JSON.stringify({ message: "Amistad eliminada" }), { status: 200 });
        }
      default:
        return new Response(JSON.stringify({ error: "Acción no válida" }), { status: 400 });
    }
  } catch (err: unknown) {
    if (err instanceof Error) {
      return new Response(JSON.stringify({ error: "Error interno del servidor", details: err.message }), { status: 500 });
    }
    return new Response(JSON.stringify({ error: "Error interno del servidor" }), { status: 500 });
  }
});
