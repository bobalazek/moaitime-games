import { useState } from 'react';
import { toast } from 'react-toastify';

import { sessionManager } from '../../utils/SessionManager';

export function JoinSessionView() {
  const [accessCode, setAccessCode] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const onJoinButtonClick = async () => {
    setIsJoining(true);

    try {
      await sessionManager.joinSession(accessCode, {
        displayName,
      });
    } catch (error: unknown) {
      toast.error(
        error instanceof Error ? error.message : 'Could not join session. Try again later.'
      );
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="container m-auto">
      <div className="mt-8 p-4 text-center text-2xl">
        <h1 className="mb-4 text-center text-4xl">Join a session</h1>
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
            className="w-full rounded border border-gray-400 p-4 text-3xl"
          />
        </div>
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
            className="w-full rounded border border-gray-400 p-4 text-3xl"
          />
        </div>
        <button
          type="button"
          disabled={isJoining}
          className="rounded border border-gray-400 px-8 py-4 text-3xl"
          onClick={onJoinButtonClick}
        >
          Join
        </button>
      </div>
    </div>
  );
}
