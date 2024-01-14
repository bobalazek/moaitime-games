import {
  API_URL,
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
  SessionTypePayloadMap,
} from '@moaitime-games/shared-common';

import { fetchJson } from './FetchHelpers';
import { webSocketClient } from './WebSocketClient';

export class SessionManager {
  private _token: string | null = null;
  private _sessionClient: SessionClientInterface | null = null;
  private _session: SessionInterface | null = null;

  getSessionClient() {
    return this._sessionClient;
  }

  getSession() {
    return this._session;
  }

  async joinSession(accessCode: string): Promise<SessionInterface> {
    const token = await this.getToken();

    webSocketClient.setToken(token);

    const session = await fetchJson<SessionInterface>(
      `${API_URL}/session/${accessCode}?byAccessCode=true`
    );
    if (!session) {
      throw new Error('Session not found');
    }

    webSocketClient.setSessionId(session.id);

    return session;
  }

  async createSession(): Promise<SessionInterface> {
    const token = await this.getToken();

    webSocketClient.setToken(token);

    const session = await fetchJson<SessionInterface>(`${API_URL}/session`, {
      method: 'POST',
    });
    if (!session) {
      throw new Error('Session not found');
    }

    webSocketClient.setSessionId(session.id);

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
}

export const sessionManager = new SessionManager();
