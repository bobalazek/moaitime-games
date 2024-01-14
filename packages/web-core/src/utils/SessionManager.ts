import {
  API_URL,
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
  SessionTypePayloadMap,
} from '@moaitime-games/shared-common';

import { useSessionStore } from '../state/sessionStore';
import { fetchJson } from './FetchHelpers';
import { webSocketClient } from './WebSocketClient';

export class SessionManager {
  private _sessionClient: SessionClientInterface | null = null;
  private _session: SessionInterface | null = null;

  private _onStateChangeCallbacks: Array<(state: SessionInterface) => void> = [];

  getSessionClient() {
    return this._sessionClient;
  }

  getSession() {
    return this._session;
  }

  async joinSession(accessCode: string, data?: Record<string, unknown>): Promise<SessionInterface> {
    if (!accessCode) {
      throw new Error('Access code is required');
    }

    const { setSessionId, setSession } = useSessionStore.getState();

    const token = await this.requestToken();

    try {
      const session = await fetchJson<SessionInterface>(
        `${API_URL}/session/${accessCode}?token=${token}&byAccessCode=true`,
        {
          method: 'POST',
          body: JSON.stringify(data),
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
          },
        }
      );

      setSessionId(session.id);

      await webSocketClient.connect();

      webSocketClient.onType(
        SessionTypeEnum.FULL_STATE_UPDATE,
        (payload: SessionTypePayloadMap[SessionTypeEnum.FULL_STATE_UPDATE]) => {
          this._session = payload;

          setSession(this._session);
        }
      );

      return session;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Session does not exist');
    }
  }

  async createSession(): Promise<SessionInterface> {
    const token = await this.requestToken();

    const session = await fetchJson<SessionInterface>(`${API_URL}/session?token=${token}`, {
      method: 'POST',
    });
    if (!session) {
      throw new Error('Session not found');
    }

    await this.joinSession(session.accessCode);

    return session;
  }

  async requestToken(): Promise<string> {
    const { token, setToken } = useSessionStore.getState();

    if (token) {
      return token;
    }

    const data = await fetchJson<{ token: string }>(`${API_URL}/token`);
    if (!data) {
      throw new Error('Could not get token');
    }

    setToken(data.token);

    return data.token;
  }

  onStateChange(callback: (state: SessionInterface) => void) {
    this._onStateChangeCallbacks.push(callback);
  }

  offStateChange(callback: (state: SessionInterface) => void) {
    this._onStateChangeCallbacks = this._onStateChangeCallbacks.filter((cb) => cb !== callback);
  }
}

export const sessionManager = new SessionManager();
