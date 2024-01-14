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

type SessionResponseType = { token: string; sessionId: string; sessionAccessCode: string };

export class SessionManager {
  private _onStateChangeCallbacks: Array<(state: SessionInterface) => void> = [];

  async joinSession(accessCode: string, data?: Record<string, unknown>): Promise<string> {
    if (!accessCode) {
      throw new Error('Access code is required');
    }

    const { token, setToken, setSessionId, setSession } = useSessionStore.getState();

    try {
      const url = new URL(`${API_URL}/session/${accessCode}?byAccessCode=true`);
      if (token) {
        url.searchParams.set('token', token);
      }

      const response = await fetchJson<SessionResponseType>(url.toString(), {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      setToken(response.token);
      setSessionId(response.sessionId);

      await webSocketClient.connect();

      webSocketClient.on<{ type: string; payload: unknown }>((data) => {
        if (data.type === SessionTypeEnum.FULL_STATE_UPDATE) {
          setSession(data.payload as SessionInterface);
        }
      });

      return response.sessionId;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Session does not exist');
    }
  }

  async createSession(): Promise<string> {
    const { setToken, setSessionId } = useSessionStore.getState();

    const response = await fetchJson<SessionResponseType>(`${API_URL}/session`, {
      method: 'POST',
    });

    setToken(response.token);
    setSessionId(response.sessionId);

    await this.joinSession(response.sessionAccessCode);

    return response.sessionId;
  }

  onStateChange(callback: (state: SessionInterface) => void) {
    this._onStateChangeCallbacks.push(callback);
  }

  offStateChange(callback: (state: SessionInterface) => void) {
    this._onStateChangeCallbacks = this._onStateChangeCallbacks.filter((cb) => cb !== callback);
  }
}

export const sessionManager = new SessionManager();
