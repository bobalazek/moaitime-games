import { useEffect, useRef, useState } from 'react';
import { ToastContainer } from 'react-toastify';

import { HomeView } from './views/HomeView';
import { JoinSessionView } from './views/JoinSessionView';

import 'react-toastify/dist/ReactToastify.css';

import { useWakeLock } from 'react-screen-wake-lock';

import { useSessionStore } from '../state/sessionStore';
import { LobbyView } from './views/LobbyView';

type View = 'home' | 'join-session';

function AppInner() {
  const { session } = useSessionStore();
  const [view, setView] = useState<View>('home');
  const isInitializedRef = useRef(false);
  const { isSupported, request } = useWakeLock();

  useEffect(() => {
    if (isInitializedRef.current) {
      return;
    }

    isInitializedRef.current = true;

    if (isSupported) {
      request();
    }
  }, [isSupported, request]);

  if (session) {
    return <LobbyView />;
  }

  if (view === 'join-session') {
    return <JoinSessionView />;
  }

  return <HomeView setView={(view) => setView(view as View)} />;
}

export function App() {
  return (
    <>
      <AppInner />
      <ToastContainer />
    </>
  );
}
