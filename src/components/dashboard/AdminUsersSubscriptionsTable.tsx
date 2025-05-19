import React, { useState, useMemo, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

export interface AdminUserSubscription {
  id: string;
  nombre: string | null;
  email: string;
  pais: string | null;
  fecha_creacion: string;
  last_login_ip: string | null;
  plan: string | null;
  status: string | null;
  started_at: string | null;
  current_period_end: string | null;
  canceled_at: string | null;
  payment_method: string | null;
  monto_total_pagado: number | null;
  fecha_ultimo_pago: string | null;
}

export const AdminUsersSubscriptionsTable: React.FC = () => {
  const [data, setData] = useState<AdminUserSubscription[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch("/api/admin-users-subs")
      .then((res) => res.json())
      .then((d) => setData(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return data;
    return data.filter(
      (u) =>
        (u.email && u.email.toLowerCase().includes(q)) ||
        (u.nombre && u.nombre.toLowerCase().includes(q))
    );
  }, [search, data]);

  return (
    <div className="w-full">
      <div className="flex items-center mb-2 gap-2">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por email o nombre..."
          className="border rounded px-2 py-1 w-full max-w-xs text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="ml-auto text-xs text-gray-500">
          {filtered.length} usuarios
        </span>
      </div>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Nombre</th>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-left">País</th>
              <th className="px-2 py-1 text-left">IP</th>
              <th className="px-2 py-1 text-left">Plan</th>
              <th className="px-2 py-1 text-left">Estado</th>
              <th className="px-2 py-1 text-left">Inicio</th>
              <th className="px-2 py-1 text-left">Vencimiento</th>
              <th className="px-2 py-1 text-left">Método</th>
              <th className="px-2 py-1 text-right">Pagado total</th>
              <th className="px-2 py-1 text-left">Último pago</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={11} className="text-center text-gray-400 py-4">
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={11} className="text-center text-gray-400 py-4">
                  No se encontraron usuarios.
                </td>
              </tr>
            ) : (
              filtered.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-2 py-1">{u.nombre || "-"}</td>
                  <td className="px-2 py-1">{u.email}</td>
                  <td className="px-2 py-1">{u.pais || "-"}</td>
                  <td className="px-2 py-1">{u.last_login_ip || "-"}</td>
                  <td className="px-2 py-1">{u.plan || "-"}</td>
                  <td className="px-2 py-1">{u.status || "-"}</td>
                  <td className="px-2 py-1">{u.started_at ? new Date(u.started_at).toLocaleDateString() : "-"}</td>
                  <td className="px-2 py-1">{u.current_period_end ? new Date(u.current_period_end).toLocaleDateString() : "-"}</td>
                  <td className="px-2 py-1">{u.payment_method || "-"}</td>
                  <td className="px-2 py-1 text-right">{u.monto_total_pagado?.toFixed(2) ?? "0.00"}</td>
                  <td className="px-2 py-1">{u.fecha_ultimo_pago ? new Date(u.fecha_ultimo_pago).toLocaleDateString() : "-"}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
