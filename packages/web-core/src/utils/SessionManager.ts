import {
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
  SessionTypePayloadMap,
} from '@moaitime-games/shared-common';

import { webSocketClient } from './WebSocketClient';

export class SessionManager {
  private _sessionClient: SessionClientInterface | null = null;
  private _session: SessionInterface | null = null;

  getSessionClient() {
    return this._sessionClient;
  }

  getSession() {
    return this._session;
  }

  async joinSession(accessCode: string): Promise<SessionInterface> {
    return new Promise((resolve) => {
      const onSessionJoined = ({
        sessionClient,
        session,
      }: SessionTypePayloadMap[SessionTypeEnum.SESSION_JOINED]) => {
        webSocketClient.offType(SessionTypeEnum.SESSION_JOINED, onSessionJoined);

        this._sessionClient = sessionClient;
        this._session = session;

        resolve(this._session);
      };

      webSocketClient.onType(SessionTypeEnum.SESSION_JOINED, onSessionJoined);

      webSocketClient.send(SessionTypeEnum.JOIN_SESSION, { accessCode });
    });
  }

  async createSession(): Promise<SessionInterface> {
    return new Promise((resolve) => {
      const onSessionCreated = ({
        sessionClient,
        session,
      }: SessionTypePayloadMap[SessionTypeEnum.SESSION_CREATED]) => {
        webSocketClient.offType(SessionTypeEnum.SESSION_CREATED, onSessionCreated);

        this._sessionClient = sessionClient;
        this._session = session;

        resolve(this._session);
      };

      webSocketClient.onType(SessionTypeEnum.SESSION_CREATED, onSessionCreated);

      webSocketClient.send(SessionTypeEnum.CREATE_SESSION);
    });
  }
}

export const sessionManager = new SessionManager();