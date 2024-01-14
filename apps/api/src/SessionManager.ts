import { generateRandomHash } from './Helpers';
import { Session } from './Session';

export type SessionManagerJoinSessionOptions = {
  displayName?: string;
};

export class SessionManager {
  private _sessionMap: Map<string, Session> = new Map();
  private _sessionAccessCodeMap: Map<string, string> = new Map();
  private _webSocketTokenToSessionIdMap: Map<string, string> = new Map();

  // Events
  onMessage(webSocketToken: string, message: string) {
    const session = this.getSessionForWebSocketToken(webSocketToken);
    if (!session) {
      return;
    }

    session.onMessage(webSocketToken, message);
  }

  onError(webSocketToken: string, error: Error) {
    this._webSocketTokenToSessionIdMap.delete(webSocketToken);
  }

  onClose(webSocketToken: string) {
    this._webSocketTokenToSessionIdMap.delete(webSocketToken);
  }

  // Session
  createSession(): Session {
    const id = generateRandomHash(8);
    if (this._sessionMap.has(id)) {
      throw new Error('Session ID already in use');
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

  joinSession(
    sessionId: string,
    webSocketToken: string,
    options?: SessionManagerJoinSessionOptions
  ) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    let displayName = options?.displayName;

    const sessionState = session.getState();

    const isHost = sessionState.clients.size === 0;
    if (isHost) {
      displayName = 'Host';
    }

    if (!displayName) {
      throw new Error('Display name not provided');
    }

    if (displayName.length < 3) {
      throw new Error('Display name must be at least 3 characters');
    } else if (displayName.length > 16) {
      throw new Error('Display name must be less than 16 characters');
    }

    const sessionClient = session.createClient(webSocketToken, displayName);

    session.addClient(sessionClient);

    if (isHost) {
      session.updateState({
        hostClientId: sessionClient.id,
      });
    }

    this._webSocketTokenToSessionIdMap.set(webSocketToken, sessionId);

    return sessionClient;
  }

  getSession(sessionId: string): Session | null {
    return this._sessionMap.get(sessionId) ?? null;
  }

  getSessionByAccessCode(sessionAccessCode: string): Session | null {
    const sessionId = this._sessionAccessCodeMap.get(sessionAccessCode);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  disposeSession(sessionId: string) {
    const session = this.getSession(sessionId);
    if (!session) {
      return;
    }

    const sessionState = session.getState();

    this._sessionMap.delete(sessionId);
    this._sessionAccessCodeMap.delete(sessionState.accessCode);

    session.dispose();
  }

  getSessionForWebSocketToken(webSocketToken: string): Session | null {
    const sessionId = this._webSocketTokenToSessionIdMap.get(webSocketToken);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }
}

export const sessionManager = new SessionManager();
