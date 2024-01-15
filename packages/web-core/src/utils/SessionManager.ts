import { toast } from 'react-toastify';

import {
  API_URL,
  serializer,
  SessionInterface,
  SessionTypeEnum,
  WS_URL,
} from '@moaitime-games/shared-common';

import { useSessionStore } from '../state/sessionStore';
import { fetchJson } from './FetchHelpers';

type SessionResponseType = { sessionToken: string; sessionId: string; sessionAccessCode: string };

export class SessionManager {
  private _webSocketClient?: WebSocket;

  private _onStateChangeCallbacks: Array<(state: SessionInterface) => void> = [];

  async joinSession(accessCode: string, data?: Record<string, unknown>): Promise<string> {
    if (!accessCode) {
      throw new Error('Access code is required');
    }

    const { sessionToken, setSessionToken, setSessionId, setSession } = useSessionStore.getState();

    try {
      const url = new URL(`${API_URL}/session/${accessCode}?byAccessCode=true`);
      if (sessionToken) {
        url.searchParams.set('sessionToken', sessionToken);
      }

      const response = await fetchJson<SessionResponseType>(url.toString(), {
        method: 'POST',
        body: JSON.stringify(data),
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      });

      const { sessionId: responseSessionId, sessionToken: responseSessionToken } = response;

      setSessionId(responseSessionId);
      setSessionToken(responseSessionToken);

      await this._connectToWebSocket();

      return response.sessionId;
    } catch (error: unknown) {
      throw new Error(error instanceof Error ? error.message : 'Session does not exist');
    }
  }

  async createSession(): Promise<string> {
    const { setSessionToken, setSessionId } = useSessionStore.getState();

    const response = await fetchJson<SessionResponseType>(`${API_URL}/session`, {
      method: 'POST',
    });

    setSessionToken(response.sessionToken);
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

  send(type: SessionTypeEnum, payload?: unknown) {
    if (!this._webSocketClient) {
      throw new Error('WebSocket connection not established');
    }

    this._webSocketClient.send(serializer.serialize({ type, payload }));
  }

  // WebSocket
  async _connectToWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { sessionToken, sessionId, resetSession } = useSessionStore.getState();
      if (!sessionId) {
        throw new Error('Session required');
      }

      const webSocketUrl = new URL(`${WS_URL}/session/${sessionId}?sessionToken=${sessionToken}`);
      const webSocketClient = new WebSocket(webSocketUrl);

      this._webSocketClient = webSocketClient;

      webSocketClient.onopen = () => {
        resolve();
      };

      webSocketClient.onmessage = (event) => {
        const data = serializer.deserialize(event.data as string) as {
          type: string;
          payload: unknown;
        };

        if (!data) {
          return;
        }

        if (data.type === SessionTypeEnum.PING) {
          this.send(SessionTypeEnum.PONG);
        } else if (data.type === SessionTypeEnum.FULL_STATE_UPDATE) {
          for (const callback of this._onStateChangeCallbacks) {
            callback(data.payload as SessionInterface);
          }
        }
      };

      webSocketClient.onerror = () => {
        resetSession();

        this._onStateChangeCallbacks = [];
        this._webSocketClient = undefined;

        toast.error('Could not establish connection to server. Please refresh the page.');

        reject();
      };

      webSocketClient.onclose = (event) => {
        resetSession();

        this._onStateChangeCallbacks = [];
        this._webSocketClient = undefined;

        toast.error(
          event.reason ?? 'Connection to server lost. Please refresh the page to reconnect.'
        );
      };
    });
  }
}

export const sessionManager = new SessionManager();
