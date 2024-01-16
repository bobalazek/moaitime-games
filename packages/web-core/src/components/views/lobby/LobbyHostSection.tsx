import { WEB_URL } from '@moaitime-games/shared-common';

import { useSessionStore } from '../../../state/sessionStore';

export function LobbyHostSection() {
  const { session } = useSessionStore();
  if (!session) {
    return null;
  }

  const accessCode = session.accessCode.replace(/(.{3})/g, '$1 ').trim();

  return (
    <div className="p-4 text-center text-2xl">
      <div className="mb-2">Your session is ready!</div>
      <div className="mb-4">
        Tell your mates to go to <b className="text-emerald-400">{WEB_URL}</b> and enter the
        following code
      </div>
      <div className="text-8xl font-bold text-emerald-400">{accessCode}</div>
    </div>
  );
}
