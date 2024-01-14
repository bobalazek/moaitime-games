import { useState } from 'react';
import { ToastContainer } from 'react-toastify';

import { CreateSessionView } from './views/CreateSessionView';
import { HomeView } from './views/HomeView';
import { JoinSessionView } from './views/JoinSessionView';

import 'react-toastify/dist/ReactToastify.css';

type View = 'home' | 'create-session' | 'join-session';

function AppInner() {
  const [view, setView] = useState<View>('home');

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
