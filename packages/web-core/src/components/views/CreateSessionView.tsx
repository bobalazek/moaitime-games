import { useEffect, useRef, useState } from 'react';

import { SessionStateInterface, WEB_URL } from '@moaitime-games/shared-common';

import { sessionManager } from '../../utils/SessionManager';

export function CreateSessionView() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [sessionState, setSessionState] = useState<SessionStateInterface | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    isInitialized.current = true;

    (async () => {
      try {
        const createdSessionState = await sessionManager.createSession();
        setSessionState(createdSessionState);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  if (isLoading) {
    return (
      <div className="p-4 text-center text-2xl">
        We are contacting the server to get all the things ready for you!
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 text-center text-2xl">
        We are sorry, but something went wrong: {error}
      </div>
    );
  }

  if (!sessionState) {
    return (
      <div className="p-4 text-center text-2xl">
        We are sorry, but we could not create a session for you. Please try again later.
      </div>
    );
  }

  const accessCode = sessionState.accessCode.replace(/(.{3})/g, '$1 ').trim();

  return (
    <div className="container m-auto">
      <div className="mt-8 p-4 text-center text-2xl">
        <div className="mb-2">Your room is ready!</div>
        <div className="mb-8">
          Tell your mates to go to <b className="text-emerald-400">{WEB_URL}</b> and enter the
          following code
        </div>
        <div className="mb-8 text-5xl font-bold text-emerald-400">{accessCode}</div>
        {sessionState.clients.length === 0 && (
          <div className="mb-8 text-2xl font-bold">Waiting for players to join ...</div>
        )}
        {sessionState.clients.length > 0 && (
          <div>
            <div className="mb-8 text-2xl font-bold">Joined:</div>
            <ul className="text-2xl">
              {sessionState.clients.map((client) => (
                <li key={client.id}>{client.displayName}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
