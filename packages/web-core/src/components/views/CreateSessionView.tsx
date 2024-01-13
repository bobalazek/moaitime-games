import { useEffect, useRef, useState } from 'react';

import { SessionInterface, WEB_URL } from '@moaitime-games/shared-common';

import { sessionManager } from '../../utils/SessionManager';

export function CreateSessionView() {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string>();
  const [session, setSession] = useState<SessionInterface | null>(null);
  const isInitialized = useRef(false);

  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    isInitialized.current = true;

    (async () => {
      try {
        const createdSession = await sessionManager.createSession();
        setSession(createdSession);
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

  if (!session) {
    return (
      <div className="p-4 text-center text-2xl">
        We are sorry, but we could not create a session for you. Please try again later.
      </div>
    );
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
        {session.clients.length === 0 && (
          <div className="mb-8 text-2xl font-bold">Waiting for players to join ...</div>
        )}
        {session.clients.length > 0 && (
          <div>
            <div className="mb-6 text-2xl font-bold">Joined</div>
            <div className="flex items-center justify-center text-2xl">
              {session.clients.map((client) => (
                <li key={client.id} className="flex rounded-full bg-slate-600 p-8">
                  {client.displayName}
                </li>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
