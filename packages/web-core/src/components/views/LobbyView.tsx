import { WEB_URL } from '@moaitime-games/shared-common';

import { useSessionStore } from '../../state/sessionStore';
import { cn } from '../../utils/StyleHelpers';

export function LobbyView() {
  const { session, token } = useSessionStore();
  if (!session) {
    return null;
  }

  const accessCode = session.accessCode.replace(/(.{3})/g, '$1 ').trim();

  return (
    <div className="container m-auto">
      <div className="mt-8 p-4 text-center text-2xl">
        <div className="mb-2">Your room is ready!</div>
        <div className="mb-8">
          Tell your mates to go to <b className="text-emerald-400">{WEB_URL}</b> and enter the
          following code
        </div>
        <div className="mb-8 text-8xl font-bold text-emerald-400">{accessCode}</div>
        {session.clients.size === 0 && (
          <div className="mb-8 text-2xl font-bold">Waiting for players to join ...</div>
        )}
        {session.clients.size > 0 && (
          <div>
            <div className="mb-6 text-2xl font-bold">Joined</div>
            <div className="flex items-center justify-center gap-2 text-2xl">
              {Array.from(session.clients.values()).map((client) => {
                const isMe = client.webSocketToken === token;

                return (
                  <div
                    key={client.id}
                    className={cn('flex rounded-full bg-slate-600 p-8', isMe && 'bg-emerald-400')}
                  >
                    {client.displayName}
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
