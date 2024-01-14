import { create } from 'zustand';

import { SessionInterface } from '@moaitime-games/shared-common';

export type SessionStore = {
  session: SessionInterface | null;
  setSession: (session: SessionInterface | null) => void;
};

export const useSessionStore = create<SessionStore>()((set) => ({
  session: null,
  setSession: (session: SessionInterface | null) => set({ session }),
}));
