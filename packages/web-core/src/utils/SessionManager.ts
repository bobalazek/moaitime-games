import {
  SessionClientInterface,
  SessionStateInterface,
  SessionTypeEnum,
  SessionTypePayloadMap,
} from '@moaitime-games/shared-common';

import { webSocketClient } from './WebSocketClient';

export class SessionManager {
  private _sessionClient: SessionClientInterface | null = null;
  private _sessionState: SessionStateInterface | null = null;

  getSessionClient() {
    return this._sessionClient;
  }

  getSessionState() {
    return this._sessionState;
  }

  async joinSession(accessCode: string): Promise<SessionStateInterface> {
    return new Promise((resolve) => {
      const onSessionJoined = ({
        sessionClient,
        sessionState,
      }: SessionTypePayloadMap[SessionTypeEnum.SESSION_JOINED]) => {
        webSocketClient.offType(SessionTypeEnum.SESSION_JOINED, onSessionJoined);

        this._sessionClient = sessionClient;
        this._sessionState = sessionState;

        resolve(this._sessionState);
      };

      webSocketClient.onType(SessionTypeEnum.SESSION_JOINED, onSessionJoined);

      webSocketClient.send(SessionTypeEnum.JOIN_SESSION, { accessCode });
    });
  }

  async createSession(): Promise<SessionStateInterface> {
    return new Promise((resolve) => {
      const onSessionCreated = ({
        sessionClient,
        sessionState,
      }: SessionTypePayloadMap[SessionTypeEnum.SESSION_CREATED]) => {
        webSocketClient.offType(SessionTypeEnum.SESSION_CREATED, onSessionCreated);

        this._sessionClient = sessionClient;
        this._sessionState = sessionState;

        resolve(this._sessionState);
      };

      webSocketClient.onType(SessionTypeEnum.SESSION_CREATED, onSessionCreated);

      webSocketClient.send(SessionTypeEnum.CREATE_SESSION);
    });
  }
}

export const sessionManager = new SessionManager();
