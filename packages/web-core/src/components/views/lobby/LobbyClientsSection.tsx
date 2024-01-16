import { useSessionStore } from '../../../state/sessionStore';
import { LobbyClient } from './LobbyClient';

export function LobbyClientsSection() {
  const { session, sessionToken } = useSessionStore();
  if (!session || !sessionToken) {
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
          <div className="flex h-24 items-center justify-center gap-2 overflow-x-auto px-4 text-2xl">
            {clients.map((client) => {
              return (
                <LobbyClient
                  key={client.id}
                  session={session}
                  sessionToken={sessionToken}
                  client={client}
                />
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
