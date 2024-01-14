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
  private _token: string | null = null;
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

    const { setSession } = useSessionStore.getState();

    const token = await this.getToken();

    webSocketClient.setToken(token);

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

      webSocketClient.setSessionId(session.id);

      await webSocketClient.connect();

      setSession(session);

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
    const token = await this.getToken();

    webSocketClient.setToken(token);

    const session = await fetchJson<SessionInterface>(`${API_URL}/session?token=${token}`, {
      method: 'POST',
    });
    if (!session) {
      throw new Error('Session not found');
    }

    await this.joinSession(session.accessCode);

    return session;
  }

  async getToken(): Promise<string> {
    if (this._token) {
      return this._token;
    }

    const data = await fetchJson<{ token: string }>(`${API_URL}/token`);
    if (!data) {
      throw new Error('Could not get token');
    }

    this._token = data.token;

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
