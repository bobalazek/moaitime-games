import { useEffect, useRef, useState } from 'react';
import { ToastContainer } from 'react-toastify';

import { CreateSessionView } from './views/CreateSessionView';
import { HomeView } from './views/HomeView';
import { JoinSessionView } from './views/JoinSessionView';

import 'react-toastify/dist/ReactToastify.css';

import { useWakeLock } from 'react-screen-wake-lock';

type View = 'home' | 'create-session' | 'join-session';

function AppInner() {
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

  if (view === 'create-session') {
    return <CreateSessionView />;
  } else if (view === 'join-session') {
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
