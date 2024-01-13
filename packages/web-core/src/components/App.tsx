import { useState } from 'react';

import { CreateSessionView } from './views/CreateSessionView';
import { HomeView } from './views/HomeView';
import { JoinSessionView } from './views/JoinSessionView';

type View = 'home' | 'create-session' | 'join-session';

export function App() {
  const [view, setView] = useState<View>('home');

  if (view === 'create-session') {
    return <CreateSessionView />;
  } else if (view === 'join-session') {
    return <JoinSessionView />;
  }

  return <HomeView setView={(view) => setView(view as View)} />;
}
