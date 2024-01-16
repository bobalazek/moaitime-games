import { ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowUpIcon, PlayIcon } from 'lucide-react';

import { SessionControllerCommandEnum } from '@moaitime-games/shared-common';

import { useSessionStore } from '../../../state/sessionStore';
import { sessionManager } from '../../../utils/SessionManager';
import { ControlButton } from '../../ui/ControlButton';

export function LobbyControllerSection() {
  const { session } = useSessionStore();
  if (!session) {
    return null;
  }

  return (
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
  );
}
