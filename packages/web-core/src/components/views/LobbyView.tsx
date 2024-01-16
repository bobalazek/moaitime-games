import { useSessionStore } from '../../state/sessionStore';
import { LobbyClientsSection } from './lobby/LobbyClientsSection';
import { LobbyControllerSection } from './lobby/LobbyControllerSection';
import { LobbyHeader } from './lobby/LobbyHeader';
import { LobbyHostSection } from './lobby/LobbyHostSection';

export function LobbyView() {
  const { session, sessionToken } = useSessionStore();
  if (!session) {
    return (
      <div className="text-2xl font-bold">Preparing your session. Please wait a moment ...</div>
    );
  }
  const clients = Object.values(session.clients);
  const myClient = clients.find((client) => client.clientSessionToken === sessionToken);

  const isHost = session.hostClientId === myClient?.id;
  const isController = session.controllerClientId === myClient?.id;

  return (
    <div className="flex flex-col gap-6">
      {!isHost && <LobbyHeader />}
      {isHost && <LobbyHostSection />}
      <LobbyClientsSection />
      {isController && <LobbyControllerSection />}
    </div>
  );
}
