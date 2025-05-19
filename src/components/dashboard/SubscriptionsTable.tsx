import React, { useState, useMemo } from "react";
import { UserIcon, MagnifyingGlassIcon, FolderOpenIcon } from "@heroicons/react/24/outline";

export interface SubscriptionUser {
  id: string;
  email: string;
  plan: string;
  status: string;
  startDate?: string;
  endDate?: string;
}

interface SubscriptionsTableProps {
  users: SubscriptionUser[];
  onViewFiles: (user: SubscriptionUser) => void;
}

export const SubscriptionsTable: React.FC<SubscriptionsTableProps> = ({ users, onViewFiles }) => {
  const [search, setSearch] = useState("");

  // Búsqueda parcial por email (case-insensitive)
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return users;
    return users.filter((u) => u.email.toLowerCase().includes(q));
  }, [search, users]);

  return (
    <div className="w-full">
      <div className="flex items-center mb-2 gap-2">
        <MagnifyingGlassIcon className="w-5 h-5 text-gray-500" />
        <input
          type="text"
          placeholder="Buscar por email..."
          className="border rounded px-2 py-1 w-full max-w-xs text-sm"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <span className="ml-auto text-xs text-gray-500">
          {filteredUsers.length} usuarios
        </span>
      </div>
      <div className="overflow-x-auto border rounded">
        <table className="min-w-full text-xs md:text-sm">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left">Email</th>
              <th className="px-2 py-1 text-left">Plan</th>
              <th className="px-2 py-1 text-left">Estado</th>
              <th className="px-2 py-1 text-left">Inicio</th>
              <th className="px-2 py-1 text-left">Fin</th>
              <th className="px-2 py-1 text-center">Archivos</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50">
                <td className="px-2 py-1 flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-gray-400" />
                  {user.email}
                </td>
                <td className="px-2 py-1">{user.plan}</td>
                <td className="px-2 py-1">{user.status}</td>
                <td className="px-2 py-1">{user.startDate ? new Date(user.startDate).toLocaleDateString() : "-"}</td>
                <td className="px-2 py-1">{user.endDate ? new Date(user.endDate).toLocaleDateString() : "-"}</td>
                <td className="px-2 py-1 text-center">
                  <button
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 hover:bg-blue-200 rounded text-xs"
                    onClick={() => onViewFiles(user)}
                  >
                    <FolderOpenIcon className="w-4 h-4" />
                    Ver archivos
                  </button>
                </td>
              </tr>
            ))}
            {filteredUsers.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-4">
                  No se encontraron usuarios.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
