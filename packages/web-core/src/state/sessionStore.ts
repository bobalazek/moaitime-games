import { create } from 'zustand';

import { SessionInterface } from '@moaitime-games/shared-common';

export type SessionStore = {
  // Session Token
  sessionToken: string | null;
  setSessionToken: (sessionToken: string | null) => void;
  // Session ID
  sessionId: string | null;
  setSessionId: (sessionId: string | null) => void;
  // Session
  session: SessionInterface | null;
  setSession: (session: SessionInterface | null) => void;
  resetSession: () => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  // Session Token
  sessionToken: null,
  setSessionToken: (sessionToken: string | null) => set({ sessionToken }),
  // Session ID
  sessionId: null,
  setSessionId: (sessionId: string | null) => set({ sessionId }),
  // Session
  session: null,
  setSession: (session: SessionInterface | null) => set({ session }),
  resetSession: () => set({ session: null, sessionId: null, sessionToken: null }),
}));
