import { useState } from 'react';
import { toast } from 'react-toastify';

import { useSessionStore } from '../../state/sessionStore';
import { sessionManager } from '../../utils/SessionManager';
import { LobbyView } from './LobbyView';

export function JoinSessionView() {
  const { session } = useSessionStore();
  const [displayName, setDisplayName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const onJoinButtonClick = async () => {
    setIsJoining(true);

    try {
      await sessionManager.joinSession(accessCode, {
        displayName,
      });
    } catch (error: unknown) {
      toast.error(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsJoining(false);
    }
  };

  if (session) {
    return <LobbyView />;
  }

  return (
    <div className="container m-auto">
      <div className="mt-8 p-4 text-center text-2xl">
        <h1 className="mb-4 text-center text-4xl">Join a session</h1>
        <div className="mb-4">
          <input
            type="text"
            placeholder="Display name"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onJoinButtonClick();
              }
            }}
            className="rounded border border-gray-400 p-2"
          />
        </div>
        <div className="mb-4">
          <input
            type="number"
            placeholder="Access code"
            value={accessCode}
            onChange={(event) => setAccessCode(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                onJoinButtonClick();
              }
            }}
            className="rounded border border-gray-400 p-2"
          />
        </div>
        <button
          type="button"
          disabled={isJoining}
          className="rounded border border-gray-400 p-2"
          onClick={onJoinButtonClick}
        >
          Join
        </button>
      </div>
    </div>
  );
}
