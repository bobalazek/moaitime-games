import { WEB_URL } from '@moaitime-games/shared-common';

import { useSessionStore } from '../../state/sessionStore';
import { cn } from '../../utils/StyleHelpers';

export function LobbyView() {
  const { session, sessionToken } = useSessionStore();
  if (!session) {
    return null;
  }

  const accessCode = session.accessCode.replace(/(.{3})/g, '$1 ').trim();
  const clients = Array.from(session.clients.values());
  const myClient = clients.find((c) => c.webSocketSessionToken === sessionToken);

  const isHost = session.hostClientId === myClient?.id;
  const isController = session.controllerClientId === myClient?.id;

  return (
    <div>
      {!isHost && (
        <header className="flex items-center justify-between bg-slate-700 p-4 text-center text-2xl">
          <div className="flex gap-4">
            <img src="/assets/moaitime_logo.png" alt="Logo" className="h-8 w-8" /> MoaiTime Games
          </div>
          <div className="font-bold text-emerald-400">{accessCode}</div>
        </header>
      )}
      {isHost && (
        <div className="mt-8 p-4 text-center text-2xl">
          <div className="mb-2">Your room is ready!</div>
          <div className="mb-8">
            Tell your mates to go to <b className="text-emerald-400">{WEB_URL}</b> and enter the
            following code
          </div>
          <div className="text-8xl font-bold text-emerald-400">{accessCode}</div>
        </div>
      )}
      <div className="mt-4">
        {clients.length === 0 && (
          <div className="text-2xl font-bold">Waiting for players to join ...</div>
        )}
        {clients.length > 0 && (
          <div>
            <div className="mb-4 text-center text-2xl font-bold">Players</div>
            <div className="flex items-center justify-center gap-2 text-2xl">
              {clients.map((client) => {
                const isClientHost = client.id === session.hostClientId;
                const isClientMe = client.webSocketSessionToken === sessionToken;
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
                    {isClientMe && !isClientHost && <span>👋</span>}
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
    </div>
  );
}
