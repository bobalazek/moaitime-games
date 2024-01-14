import { SessionClientInterface } from '@moaitime-games/shared-common';

import { generateRandomHash } from './Helpers';
import { Session } from './Session';

export class SessionManager {
  private _sessionClientMap: Map<string, SessionClientInterface> = new Map();

  private _webSocketClientToSessionClientMap: Map<string, string> = new Map();

  private _sessionMap: Map<string, Session> = new Map();
  private _sessionAccessCodeMap: Map<string, string> = new Map();

  // Events
  onMessage(webSocketToken: string, message: string) {
    const data = JSON.parse(message);

    if (data.type === 'ping') {
      this.onPing(webSocketToken);
    }
  }

  onError(webSocketToken: string, error: Error) {
    // TODO
  }

  onClose(webSocketToken: string) {
    const sessionClient = this.getSessionClient(webSocketToken);
    if (!sessionClient) {
      return;
    }

    sessionClient.disconnectedAt = Date.now();
  }

  // Sub-Events
  onPing(webSocketToken: string) {
    const sessionClient = this.getSessionClient(webSocketToken);
    if (!sessionClient) {
      return;
    }

    sessionClient.lastPingAt = Date.now();
  }

  // Session
  createSession(): Session {
    const id = generateRandomHash(8);
    if (this._sessionMap.has(id)) {
      throw new Error('Session id already in use');
    }

    const accessCode = Math.floor(Math.random() * 899999 + 100000).toString();
    if (this._sessionAccessCodeMap.has(accessCode)) {
      throw new Error('Access code already in use');
    }

    const session = new Session(id, accessCode);

    this._sessionMap.set(id, session);
    this._sessionAccessCodeMap.set(accessCode, id);

    return session;
  }

  getSession(id: string): Session | null {
    return this._sessionMap.get(id) ?? null;
  }

  getSessionByAccessCode(accessCode: string): Session | null {
    const sessionId = this._sessionAccessCodeMap.get(accessCode);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  // Session Client
  createSessionClient(session: Session, webSocketToken: string): SessionClientInterface {
    const sessionClient = session.createClient(webSocketToken);

    this._sessionClientMap.set(sessionClient.id, sessionClient);
    this._webSocketClientToSessionClientMap.set(webSocketToken, sessionClient.id);

    return sessionClient;
  }

  getSessionClient(webSocketToken: string): SessionClientInterface | null {
    const sessionClientId = this._webSocketClientToSessionClientMap.get(webSocketToken);
    if (!sessionClientId) {
      return null;
    }

    return this._sessionClientMap.get(sessionClientId) ?? null;
  }
}

export const sessionManager = new SessionManager();
