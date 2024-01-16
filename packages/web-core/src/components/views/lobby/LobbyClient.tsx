import { SessionClientInterface, SessionInterface } from '@moaitime-games/shared-common';

import { cn } from '../../../utils/StyleHelpers';

export function LobbyClient({
  session,
  sessionToken,
  client,
}: {
  session: SessionInterface;
  sessionToken: string;
  client: SessionClientInterface;
}) {
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
      {isClientHost && <span>📺</span>}
      {isClientController && <span>🎮</span>}
      <span>{client.displayName}</span>
      <span
        className={cn(
          'absolute right-0 top-0 flex h-6 items-center justify-center rounded-full bg-white px-2 text-sm font-bold text-black',
          client.disconnectedAt && 'bg-red-800 text-white'
        )}
      >
        {client.ping}
      </span>
    </div>
  );
}
