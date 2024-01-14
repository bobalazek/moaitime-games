import { create } from 'zustand';

import { SessionInterface } from '@moaitime-games/shared-common';

export type SessionStore = {
  // Token
  token: string | null;
  setToken: (token: string | null) => void;
  // Session ID
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
  // Session
  session: SessionInterface | null;
  setSession: (session: SessionInterface | null) => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  // Token
  token: null,
  setToken: (token: string | null) => set({ token }),
  // Session ID
  sessionId: null,
  setSessionId: (sessionId: string | null) => set({ sessionId }),
  // Session
  session: null,
  setSession: (session: SessionInterface | null) => set({ session }),
}));
