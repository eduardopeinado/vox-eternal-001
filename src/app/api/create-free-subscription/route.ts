import { NextResponse } from "next/server";
import { createServerActionClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createServerActionClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar si ya tiene suscripción activa
  const { data: existing, error: subError } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (subError) {
    return NextResponse.json({ error: "Error consultando suscripciones" }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json({ message: "Ya tiene suscripción activa" });
  }

  // Insertar suscripción gratuita
  const { error: insertError } = await supabase.from("subscriptions").insert([
    {
      user_id: user.id,
      plan: "Gratis",
      status: "active",
      started_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ]);

  if (insertError) {
    return NextResponse.json({ error: "Error creando suscripción gratuita" }, { status: 500 });
  }

  return NextResponse.json({ message: "Suscripción gratuita creada" });
}
