"use client";
import React, { useState } from "react";
import { Metrics } from "@/app/admin/dashboard/Metrics";
import { AdminUsersSubscriptionsTable } from "./AdminUsersSubscriptionsTable";

type TabKey = "metrics" | "users";

export const AdminDashboardTabs: React.FC<{ metrics: any }> = ({ metrics }) => {
  const [tab, setTab] = useState<TabKey>("metrics");

  return (
    <div>
      <div className="flex gap-2 border-b mb-4">
        <button
          className={`px-4 py-2 font-semibold border-b-2 ${
            tab === "metrics"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => setTab("metrics")}
        >
          Métricas generales
        </button>
        <button
          className={`px-4 py-2 font-semibold border-b-2 ${
            tab === "users"
              ? "border-blue-600 text-blue-700"
              : "border-transparent text-gray-500"
          }`}
          onClick={() => setTab("users")}
        >
          Usuarios & Suscripciones
        </button>
      </div>
      <div>
        {tab === "metrics" && <Metrics metrics={metrics} />}
        {tab === "users" && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Usuarios y suscripciones</h2>
            <AdminUsersSubscriptionsTable />
          </section>
        )}
      </div>
    </div>
  );
};
