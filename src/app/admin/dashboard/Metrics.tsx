"use client";
import React from "react";
import { KpiCard } from "@/components/dashboard/cards/KpiCard";
import { PlanDistributionPie } from "@/components/dashboard/charts/PlanDistributionPie";
import { SubscriptionStatusBar } from "@/components/dashboard/charts/SubscriptionStatusBar";
import { UserGroupIcon, UserPlusIcon } from "@heroicons/react/24/solid";

type MetricsData = {
  totalUsers: number;
  newUsers: number;
  planDistribution: { plan: string; count: number }[];
  subscriptionStatus: { status: string; count: number }[];
  totalVoicefixerCalls?: number;
  voicefixerCallsLast30d?: number;
  totalReplicateCalls?: number;
  replicateCallsLast30d?: number;
  storageByUser?: { user_id: string; total_bytes: number }[];
  storageTotalBytes?: number;
};

export function Metrics({ metrics }: { metrics: MetricsData | null }) {
  if (!metrics) {
    return <div>Cargando métricas...</div>;
  }

  // Límite global de almacenamiento contratado (ajustar según proveedor real)
  const STORAGE_TOTAL_LIMIT_GB = 100; // Ejemplo: 100 GB contratados
  const storageTotalGB =
    metrics.storageTotalBytes !== undefined
      ? metrics.storageTotalBytes / (1024 * 1024 * 1024)
      : 0;
  const storagePct =
    STORAGE_TOTAL_LIMIT_GB > 0
      ? (storageTotalGB / STORAGE_TOTAL_LIMIT_GB) * 100
      : 0;

  return (
    <div className="flex flex-col gap-8">
      {/* KPIs principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-6">
        <KpiCard
          title="Usuarios Totales"
          value={metrics.totalUsers}
          icon={<UserGroupIcon className="w-6 h-6" />}
          color="bg-indigo-500"
        />
        <KpiCard
          title="Nuevos Usuarios (30 días)"
          value={metrics.newUsers}
          icon={<UserPlusIcon className="w-6 h-6" />}
          color="bg-emerald-500"
        />
        <KpiCard
          title="Llamadas a Replicate (30 días)"
          value={metrics.replicateCallsLast30d ?? "0"}
          icon={<span>🤖</span>}
          color="bg-sky-500"
          subtitle={`Total histórico: ${metrics.totalReplicateCalls ?? 0}`}
        />
        <KpiCard
          title="Llamadas a Voicefixer (30 días)"
          value={metrics.voicefixerCallsLast30d ?? "0"}
          icon={<span>🎤</span>}
          color="bg-pink-500"
          subtitle={`Total histórico: ${metrics.totalVoicefixerCalls ?? 0}`}
        />
        {/* KPI de almacenamiento total */}
        <KpiCard
          title="Almacenamiento Total"
          value={
            metrics.storageTotalBytes !== undefined
              ? `${storageTotalGB.toFixed(2)} GB / ${STORAGE_TOTAL_LIMIT_GB} GB`
              : "—"
          }
          icon={<span>💾</span>}
          color={
            storagePct >= 90
              ? "bg-red-500"
              : storagePct >= 75
              ? "bg-orange-500"
              : "bg-gray-700"
          }
          subtitle={
            metrics.storageTotalBytes !== undefined
              ? `Uso: ${storagePct.toFixed(0)}% del espacio contratado`
              : "Suma de todos los recuerdos"
          }
        />
      </div>

      {/* Visualizaciones principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <PlanDistributionPie data={metrics.planDistribution} />
        {/* Tabla de uso de almacenamiento por usuario */}
        <div className="p-4 border rounded-xl shadow bg-white flex flex-col min-h-[260px]">
          <h3 className="font-semibold mb-2">Uso de almacenamiento por usuario</h3>
          {metrics.storageByUser && metrics.storageByUser.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs md:text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">User ID</th>
                    <th className="px-2 py-1 text-right">Uso (MB)</th>
                    <th className="px-2 py-1 text-right">Límite (MB)</th>
                    <th className="px-2 py-1 text-right">%</th>
                    <th className="px-2 py-1 text-center">Alerta</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.storageByUser
                    .sort((a, b) => b.total_bytes - a.total_bytes)
                    .slice(0, 20)
                    .map((row) => {
                      // Por ahora, límite ficticio: 500MB (Gratis). Para integración real, cruzar con plan del usuario.
const limiteMB = 500;
const usoMB = row.total_bytes / (1024 * 1024);
const pct = Number(limiteMB) === 0 ? 0 : (usoMB / Number(limiteMB)) * 100;
                      let alerta = "";
                      let alertaColor = "";
                      if (pct >= 100) {
                        alerta = "Superado";
                        alertaColor = "text-red-600 font-bold";
                      } else if (pct >= 80) {
                        alerta = "Alto";
                        alertaColor = "text-orange-500 font-semibold";
                      }
                      return (
                        <tr key={row.user_id}>
                          <td className="px-2 py-1">{row.user_id}</td>
                          <td className="px-2 py-1 text-right">{usoMB.toFixed(2)}</td>
                          <td className="px-2 py-1 text-right">{limiteMB}</td>
                          <td className="px-2 py-1 text-right">{pct.toFixed(0)}%</td>
                          <td className={`px-2 py-1 text-center ${alertaColor}`}>{alerta}</td>
                        </tr>
                      );
                    })}
                </tbody>
              </table>
              <div className="text-xs text-gray-500 mt-2">
                Mostrando top 20 usuarios por uso. Límite real por plan se integrará.
              </div>
            </div>
          ) : (
            <span className="text-gray-400 italic">Sin datos de almacenamiento.</span>
          )}
        </div>
      </div>

      {/* Bar chart de suscripciones */}
      <div>
        <SubscriptionStatusBar data={metrics.subscriptionStatus} />
      </div>
    </div>
  );
}
