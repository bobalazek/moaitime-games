import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, PlayIcon } from 'lucide-react';

import { SessionControllerCommandEnum, WEB_URL } from '@moaitime-games/shared-common';

import { useSessionStore } from '../../state/sessionStore';
import { sessionManager } from '../../utils/SessionManager';
import { cn } from '../../utils/StyleHelpers';
import { ControlButton } from '../ui/ControlButton';

export function LobbyView() {
  const { session, sessionToken } = useSessionStore();
  if (!session) {
    return <div className="text-2xl font-bold">Preparing your room. Please wait a moment ...</div>;
  }

  const accessCode = session.accessCode.replace(/(.{3})/g, '$1 ').trim();
  const clients = Object.values(session.clients);
  const myClient = clients.find((client) => client.clientSessionToken === sessionToken);

  const isHost = session.hostClientId === myClient?.id;
  const isController = session.controllerClientId === myClient?.id;

  return (
    <div className="flex flex-col gap-6">
      {!isHost && (
        <header className="flex items-center justify-between bg-slate-700 p-4 text-center text-2xl">
          <div className="flex gap-4">
            <img src="/assets/moaitime_logo.png" alt="Logo" className="h-8 w-8" /> MoaiTime Games
          </div>
          <div className="font-bold text-emerald-400">{accessCode}</div>
        </header>
      )}
      {isHost && (
        <div className="p-4 text-center text-2xl">
          <div className="mb-2">Your room is ready!</div>
          <div className="mb-4">
            Tell your mates to go to <b className="text-emerald-400">{WEB_URL}</b> and enter the
            following code
          </div>
          <div className="text-8xl font-bold text-emerald-400">{accessCode}</div>
        </div>
      )}
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
      {isController && (
        <div>
          <div className="mb-4 text-center text-2xl font-bold">Controls</div>
          <div className="flex flex-col justify-center gap-2">
            <div className="flex justify-center">
              <ControlButton
                onClick={() => {
                  sessionManager.sendControllerCommand(SessionControllerCommandEnum.UP);
                }}
              >
                <ArrowUpIcon size={48} />
              </ControlButton>
            </div>
            <div className="flex justify-center gap-2">
              <ControlButton
                onClick={() => {
                  sessionManager.sendControllerCommand(SessionControllerCommandEnum.LEFT);
                }}
              >
                <ArrowLeftIcon size={48} />
              </ControlButton>
              <ControlButton
                onClick={() => {
                  sessionManager.sendControllerCommand(SessionControllerCommandEnum.CONFIRM);
                }}
              >
                <PlayIcon size={48} />
              </ControlButton>
              <ControlButton
                onClick={() => {
                  sessionManager.sendControllerCommand(SessionControllerCommandEnum.RIGHT);
                }}
              >
                <ArrowRightIcon size={48} />
              </ControlButton>
            </div>
            <div className="flex justify-center">
              <ControlButton
                onClick={() => {
                  sessionManager.sendControllerCommand(SessionControllerCommandEnum.DOWN);
                }}
              >
                <ArrowDownIcon size={48} />
              </ControlButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
