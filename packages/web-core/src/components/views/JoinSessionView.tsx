import { useState } from 'react';

import { sessionManager } from '../../utils/SessionManager';

export function JoinSessionView() {
  const [displayName, setDisplayName] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string>();
  const [isJoining, setIsJoining] = useState(false);

  const onJoinButtonClick = async () => {
    setIsJoining(true);

    try {
      await sessionManager.joinSession(accessCode);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsJoining(false);
    }
  };

  if (error) {
    return (
      <div className="p-4 text-center text-2xl">
        We are sorry, but something went wrong: {error}
      </div>
    );
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
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded border border-gray-400 p-2"
          />
        </div>
        <div className="mb-4">
          <input
            type="number"
            placeholder="Room code"
            value={accessCode}
            onChange={(e) => setAccessCode(e.target.value)}
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
