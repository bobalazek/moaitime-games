import {
  DevicePlatformEnum,
  DeviceTypeEnum,
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
} from '@moaitime-games/shared-common';

import { generateRandomHash } from './Helpers';
import { WebSocketManager, webSocketManager } from './WebSocketManager';

export class SessionManager {
  private _sessionClientMap: Map<string, SessionClientInterface> = new Map();
  private _webSocketClientToSessionClientMap: Map<string, string> = new Map();
  private _sessionMap: Map<string, SessionInterface> = new Map();

  constructor(private _webSocketManager: WebSocketManager) {}

  // Main Events
  onMessage(webSocketClientId: string, message: string) {
    const data = JSON.parse(message);

    if (data.type === 'ping') {
      this.onPing(webSocketClientId);
    } else if (data.type === SessionTypeEnum.CREATE_SESSION) {
      this.onCreateSession(webSocketClientId);
    }
  }

  onError(webSocketClientId: string, error: Error) {
    // TODO
  }

  onClose(webSocketClientId: string) {
    const sessionClient = this.getSessionClient(webSocketClientId);
    if (!sessionClient) {
      return;
    }

    sessionClient.disconnectedAt = Date.now();
  }

  // Events
  onPing(webSocketClientId: string) {
    const sessionClient = this.getSessionClient(webSocketClientId);
    if (!sessionClient) {
      return;
    }

    sessionClient.lastPingAt = Date.now();
  }

  onCreateSession(webSocketClientId: string) {
    const sessionClient = this.createSessionClient(webSocketClientId);
    const session = this.createSession(sessionClient);

    this._webSocketManager.sendToWebSocketClient(
      webSocketClientId,
      SessionTypeEnum.SESSION_CREATED,
      {
        sessionClient,
        session,
      }
    );
  }

  // Session Client
  createSessionClient(webSocketClientId: string): SessionClientInterface {
    const id = generateRandomHash(8);
    const now = Date.now();

    const sessionClient: SessionClientInterface = {
      id,
      webSocketClientId,
      displayName: 'Host',
      deviceType: DeviceTypeEnum.UNKNOWN,
      devicePlatform: DevicePlatformEnum.UNKNOWN,
      connectedAt: now,
      disconnectedAt: 0,
      lastPingAt: now,
    };

    this._sessionClientMap.set(id, sessionClient);
    this._webSocketClientToSessionClientMap.set(webSocketClientId, id);

    return sessionClient;
  }

  getSessionClient(webSocketClientId: string): SessionClientInterface | null {
    const sessionClientId = this._webSocketClientToSessionClientMap.get(webSocketClientId);
    if (!sessionClientId) {
      return null;
    }

    return this._sessionClientMap.get(sessionClientId) ?? null;
  }

  // Session
  createSession(sessionClient: SessionClientInterface): SessionInterface {
    const id = generateRandomHash(8);
    const accessCode = Math.floor(Math.random() * 899999 + 100000).toString();

    const session: SessionInterface = {
      id,
      accessCode,
      clients: [sessionClient],
      createdAt: Date.now(),
    };

    this._sessionMap.set(id, session);

    return session;
  }

  getSession(id: string): SessionInterface | null {
    return this._sessionMap.get(id) ?? null;
  }
}

export const sessionManager = new SessionManager(webSocketManager);
