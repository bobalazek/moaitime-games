import { useEffect, useRef, useState } from 'react';

import { SessionInterface } from '@moaitime-games/shared-common';

import { sessionManager } from '../../utils/SessionManager';
import { LobbyView } from './LobbyView';

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

    const onStateChange = (updatedSession: SessionInterface) => {
      setSession(updatedSession);
    };

    (async () => {
      try {
        const createdSession = await sessionManager.createSession();

        setSession(createdSession);

        sessionManager.onStateChange(onStateChange);
      } catch (error: unknown) {
        setError(error instanceof Error ? error.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    })();

    return () => {
      sessionManager.offStateChange(onStateChange);
    };
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

  return <LobbyView />;
}
