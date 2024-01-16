import { toast } from 'react-toastify';

import {
  API_URL,
  patcher,
  PatcherOperation,
  serializer,
  SessionControllerCommandEnum,
  SessionInterface,
  SessionTypeEnum,
  SessionWebSocketMessage,
  WS_URL,
} from '@moaitime-games/shared-common';

import { useSessionStore } from '../state/sessionStore';
import { fetchJson } from './FetchHelpers';

type SessionResponseType = { sessionToken: string; sessionId: string; sessionAccessCode: string };

export class SessionManager {
  private _webSocketClient?: WebSocket;

  async joinSession(accessCode: string, data?: Record<string, unknown>): Promise<string> {
    if (!accessCode) {
      throw new Error('Access code is required');
    }

    const { sessionToken, setSessionToken, setSessionId } = useSessionStore.getState();

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

      await this._initWebSocket();

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

  // Send
  send(type: SessionTypeEnum, payload?: unknown) {
    if (!this._webSocketClient) {
      throw new Error('WebSocket connection not established');
    }

    this._webSocketClient.send(serializer.serialize(payload ? [type, payload] : [type]));
  }

  // Send controller command
  sendControllerCommand(command: SessionControllerCommandEnum) {
    this.send(SessionTypeEnum.CONTROLLER_COMMAND, command);
  }

  // WebSocket
  async _initWebSocket(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { sessionToken, sessionId, setSession, resetSession } = useSessionStore.getState();
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
        const data = serializer.deserialize(event.data as string) as SessionWebSocketMessage;
        if (!data) {
          return;
        }

        const [type, payload] = data;

        if (type === SessionTypeEnum.PING) {
          this.send(SessionTypeEnum.PONG, payload);
        } else if (type === SessionTypeEnum.FULL_STATE_UPDATE) {
          setSession(payload as SessionInterface);
        } else if (type === SessionTypeEnum.DELTA_STATE_UPDATE) {
          const currentSession = useSessionStore.getState().session;
          if (!currentSession) {
            return;
          }

          const newSession = patcher.applyPatch(currentSession, payload as PatcherOperation[]);
          if (!newSession) {
            return;
          }

          setSession(newSession);
        }
      };

      webSocketClient.onerror = () => {
        resetSession();

        this._webSocketClient = undefined;

        toast.error(
          'There was an error while trying to connect to the web socket. Please refresh the page.'
        );

        reject();
      };

      webSocketClient.onclose = (event) => {
        resetSession();

        this._webSocketClient = undefined;

        toast.error(
          event.reason || 'Connection to server lost. Please refresh the page to reconnect.'
        );
      };
    });
  }
}

export const sessionManager = new SessionManager();
