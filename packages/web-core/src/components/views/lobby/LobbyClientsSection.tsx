import { useSessionStore } from '../../../state/sessionStore';
import { cn } from '../../../utils/StyleHelpers';

export function LobbyClientsSection() {
  const { session, sessionToken } = useSessionStore();
  if (!session) {
    return null;
  }

  const clients = Object.values(session.clients);

  return (
    <div>
      {clients.length === 0 && (
        <div className="text-2xl font-bold">Waiting for players to join ...</div>
      )}
      {clients.length > 0 && (
        <div>
          <div className="mb-4 text-center text-2xl font-bold">Players</div>
          {/* here we want a horizontal scroll */}
          <div className="flex h-24 items-center justify-center gap-2 overflow-x-auto px-4 text-2xl">
            {clients.map((client) => {
              const isClientHost = client.id === session.hostClientId;
              const isClientMe = client.clientSessionToken === sessionToken;
              const isClientController = client.id === session.controllerClientId;

              return (
                <div
                  key={client.id}
                  className={cn(
                    'relative flex gap-2 rounded-full bg-slate-600 p-6',
                    isClientMe && 'bg-emerald-400'
                  )}
                >
                  <span>{client.displayName}</span>
                  {isClientHost && <span>📺</span>}
                  {isClientController && <span>🎮</span>}
                  <span className="absolute right-0 top-0 flex h-6 items-center justify-center rounded-full bg-white px-2 text-sm font-bold text-black">
                    {client.ping}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
