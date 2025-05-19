import { useState } from "react";
import { useUserSearch } from "../../hooks/useUserSearch";
import type { UserProfile } from "../../types/friendship";

interface UserSearchProps {
  excludeIds: string[];
  onSendRequest: (userId: string) => void;
  countries: string[];
}

export function UserSearch({ excludeIds, onSendRequest, countries }: UserSearchProps) {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const { results, loading, error, searchUsers } = useUserSearch();

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    searchUsers(query, country, excludeIds);
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-2">Buscar usuarios</h2>
      <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-2 mb-4">
        <input
          type="text"
          placeholder="Nombre"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 flex-1"
        />
        <select
          value={country}
          onChange={(e) => setCountry(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2"
        >
          <option value="">Todos los países</option>
          {countries.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <button
          type="submit"
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          disabled={loading}
        >
          Buscar
        </button>
      </form>
      {error && <p className="text-red-600 mb-2">{error}</p>}
      {loading && <p className="text-gray-500">Buscando...</p>}
      <ul className="space-y-2">
        {results.map((user: UserProfile) => (
          <li key={user.id} className="flex items-center justify-between border-b py-2">
            <div className="flex items-center gap-3">
              {user.avatar_url ? (
                <img src={user.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">👤</span>
                </div>
              )}
              <span className="font-medium">{user.nombre}</span>
              <span className="text-xs text-gray-500">{user.pais}</span>
            </div>
            <button
              className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
              onClick={() => onSendRequest(user.id)}
            >
              Enviar solicitud
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default UserSearch;
