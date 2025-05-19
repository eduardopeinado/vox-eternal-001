import type { FriendRequest } from "../../types/friendship";

interface FriendRequestsProps {
  received: FriendRequest[];
  sent: FriendRequest[];
  onAccept: (requestId: string) => void;
  onReject: (requestId: string) => void;
  onCancel: (requestId: string) => void;
}

export function FriendRequests({
  received,
  sent,
  onAccept,
  onReject,
  onCancel,
}: FriendRequestsProps) {
  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-2">Solicitudes de amistad</h2>
      {/* Recibidas */}
      <div className="mb-4">
        <h3 className="font-medium mb-1 text-sm">Recibidas</h3>
        {received.length === 0 ? (
          <div className="text-gray-500 text-sm">No tienes solicitudes recibidas.</div>
        ) : (
          <ul className="space-y-2">
            {received.map((req) => (
              <li key={req.id} className="flex items-center justify-between border-b py-2">
                <div className="flex items-center gap-3">
                  {req.usuario?.avatar_url ? (
                    <img src={req.usuario.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">👤</span>
                    </div>
                  )}
                  <span className="font-medium">{req.usuario?.nombre}</span>
                  <span className="text-xs text-gray-500">{req.usuario?.pais}</span>
                </div>
                <div className="flex gap-2">
                  <button
                    className="bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 text-sm"
                    onClick={() => onAccept(req.id)}
                  >
                    Aceptar
                  </button>
                  <button
                    className="bg-gray-400 text-white px-3 py-1 rounded hover:bg-gray-500 text-sm"
                    onClick={() => onReject(req.id)}
                  >
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Enviadas */}
      <div>
        <h3 className="font-medium mb-1 text-sm">Enviadas</h3>
        {sent.length === 0 ? (
          <div className="text-gray-500 text-sm">No tienes solicitudes enviadas.</div>
        ) : (
          <ul className="space-y-2">
            {sent.map((req) => (
              <li key={req.id} className="flex items-center justify-between border-b py-2">
                <div className="flex items-center gap-3">
                  {req.amigo?.avatar_url ? (
                    <img src={req.amigo.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                      <span className="text-gray-400 text-lg">👤</span>
                    </div>
                  )}
                  <span className="font-medium">{req.amigo?.nombre}</span>
                  <span className="text-xs text-gray-500">{req.amigo?.pais}</span>
                </div>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
                  onClick={() => onCancel(req.id)}
                >
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default FriendRequests;
