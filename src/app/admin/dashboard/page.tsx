import React from "react";
import { createServerComponentClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { AdminDashboardTabs } from "@/components/dashboard/AdminDashboardTabs";

import { createClient } from "@supabase/supabase-js";

async function fetchMetrics(supabase: any) {
  // Número total de usuarios activos (usando service role para evitar RLS)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  let totalUsers = 0;
  let storageByUser: { user_id: string; total_bytes: number }[] = [];
  let storageTotalBytes = 0;

  let adminClient = supabase;
  if (serviceRoleKey && supabaseUrl) {
    adminClient = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { count } = await adminClient
      .from("usuarios")
      .select("id", { count: "exact", head: true });
    totalUsers = count || 0;

    // Uso de almacenamiento por usuario
    const { data: storageAgg, error: storageAggError } = await adminClient
      .from("recuerdos")
      .select("user_id, sum:tamaño")
      // .group("user_id"); // No soportado en Supabase JS

    if (Array.isArray(storageAgg)) {
      storageByUser = storageAgg
        .filter((row: any) => row.user_id)
        .map((row: any) => ({
          user_id: row.user_id,
          total_bytes: Number(row["sum"] ?? row["sum:tamaño"] ?? 0),
        }));
    }

    // Uso total de almacenamiento
    const { data: totalStorageData } = await adminClient
      .from("recuerdos")
      .select("tamaño", { head: false });
    if (Array.isArray(totalStorageData)) {
      storageTotalBytes = totalStorageData.reduce((acc: number, row: any) => acc + Number(row.tamaño || 0), 0);
    }
  } else {
    // Fallback: usar el cliente autenticado (puede estar limitado por RLS)
    const { count } = await supabase
      .from("usuarios")
      .select("id", { count: "exact", head: true });
    totalUsers = count || 0;

    // Uso de almacenamiento por usuario
    const { data: storageAgg } = await supabase
      .from("recuerdos")
      .select("user_id, sum:tamaño");
      // .group("user_id"); // No soportado en Supabase JS

    if (Array.isArray(storageAgg)) {
      storageByUser = storageAgg
        .filter((row: any) => row.user_id)
        .map((row: any) => ({
          user_id: row.user_id,
          total_bytes: Number(row["sum"] ?? row["sum:tamaño"] ?? 0),
        }));
    }

    // Uso total de almacenamiento
    const { data: totalStorageData } = await supabase
      .from("recuerdos")
      .select("tamaño", { head: false });
    if (Array.isArray(totalStorageData)) {
      storageTotalBytes = totalStorageData.reduce((acc: number, row: any) => acc + Number(row.tamaño || 0), 0);
    }
  }

  // Nuevos registros últimos 30 días
  const { count: newUsers } = await supabase
    .from("usuarios")
    .select("id", { count: "exact", head: true })
    .gte("created_at", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Distribución de planes de suscripción (usuarios únicos por plan activo) usando función SQL segura
  const { data: planDistributionFinal, error: planDistError } = await supabase.rpc("usuarios_por_plan_activo");

  // Estado de suscripciones
  const { data: subscriptionStatus } = await supabase
    .from("subscriptions")
    .select("status, count:user_id");

  // Llamadas a Voicefixer (mejoras de audio)
  const { count: totalVoicefixerCalls } = await supabase
    .from("mejoras_ia_log")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "audio");

  const { count: voicefixerCallsLast30d } = await supabase
    .from("mejoras_ia_log")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "audio")
    .gte("fecha", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  // Llamadas a Replicate (mejoras de imagen)
  const { count: totalReplicateCalls } = await supabase
    .from("mejoras_ia_log")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "foto");

  const { count: replicateCallsLast30d } = await supabase
    .from("mejoras_ia_log")
    .select("id", { count: "exact", head: true })
    .eq("tipo", "foto")
    .gte("fecha", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

  return {
    totalUsers,
    newUsers: newUsers || 0,
    planDistribution: planDistributionFinal ?? [],
    subscriptionStatus: subscriptionStatus || [],
    totalVoicefixerCalls: totalVoicefixerCalls || 0,
    voicefixerCallsLast30d: voicefixerCallsLast30d || 0,
    totalReplicateCalls: totalReplicateCalls || 0,
    replicateCallsLast30d: replicateCallsLast30d || 0,
    storageByUser,
    storageTotalBytes,
  };
}

export default async function AdminDashboard() {
  const supabase = await createServerComponentClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Acceso denegado. No tienes permisos para ver esta página.
        <br />
        User ID actual: No autenticado
      </div>
    );
  }

  // Consultar el campo 'rol' del usuario en la tabla usuarios
  const { data: usuario, error } = await supabase
    .from("usuarios")
    .select("rol")
    .eq("id", user.id)
    .single();

  if (error || !usuario || usuario.rol !== "admin") {
    return (
      <div className="p-8 text-center text-red-600 font-semibold">
        Acceso denegado. No tienes permisos para ver esta página.
        <br />
        <span className="text-sm text-gray-700">
          <b>Debug info:</b>
          <br />
          User ID actual: {user.id}
          <br />
          Resultado consulta: {usuario ? JSON.stringify(usuario) : "No encontrado"}
          <br />
          Error: {error ? JSON.stringify(error) : "Sin error"}
        </span>
      </div>
    );
  }

  // Fetch de métricas en el server (SSR)
  const metrics = await fetchMetrics(supabase);

  return (
    <main className="p-8 space-y-8 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-4">Dashboard Administrativo</h1>
      <AdminDashboardTabs metrics={metrics} />
    </main>
  );
}
