import type { AcceptedFriend } from "../../hooks/useFriendship";

interface FriendsListProps {
  friends: AcceptedFriend[];
  onRemove: (amistadId: string) => void;
}

export function FriendsList({ friends, onRemove }: FriendsListProps) {
  if (friends.length === 0) {
    return <div className="text-gray-500 mb-8">No tienes amigos aún.</div>;
  }

  return (
    <div className="mb-8">
      <h2 className="text-lg font-semibold mb-2">Tus amigos</h2>
      <ul className="space-y-2">
        {friends.map((friend) => (
          <li key={friend.amistadId} className="flex items-center justify-between border-b py-2">
            <div className="flex items-center gap-3">
              {friend.amigo.avatar_url ? (
                <img src={friend.amigo.avatar_url} alt="avatar" className="w-8 h-8 rounded-full object-cover" style={{ width: "auto", height: "auto" }} />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400 text-lg">👤</span>
                </div>
              )}
              <span className="font-medium">{friend.amigo.nombre}</span>
              <span className="text-xs text-gray-500">{friend.amigo.pais}</span>
            </div>
            <button
              className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700 text-sm"
              onClick={() => onRemove(friend.amistadId)}
            >
              Eliminar amistad
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default FriendsList;
