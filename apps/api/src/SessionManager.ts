import { generateRandomHash } from './Helpers';
import { Session } from './Session';

export type SessionManagerJoinSessionOptions = {
  displayName?: string;
};

export class SessionManager {
  private _sessionMap: Map<string, Session> = new Map();
  private _sessionAccessCodeMap: Map<string, string> = new Map();
  private _webSocketSessionTokenToSessionIdMap: Map<string, string> = new Map();

  constructor() {
    this.init();
  }

  init() {
    // TODO: loop through each session and determine if it's stale
  }

  // Events
  onMessage(webSocketSessionToken: string, message: string) {
    const session = this.getSessionForWebSocketSessionToken(webSocketSessionToken);
    if (!session) {
      return;
    }

    session.onMessage(webSocketSessionToken, message);
  }

  onError(webSocketSessionToken: string, error: Error) {
    const session = this.getSessionForWebSocketSessionToken(webSocketSessionToken);
    if (!session) {
      return;
    }

    session.onError(webSocketSessionToken, error);

    this._webSocketSessionTokenToSessionIdMap.delete(webSocketSessionToken);
  }

  onClose(webSocketSessionToken: string) {
    const session = this.getSessionForWebSocketSessionToken(webSocketSessionToken);
    if (!session) {
      return;
    }

    session.onClose(webSocketSessionToken);

    this._webSocketSessionTokenToSessionIdMap.delete(webSocketSessionToken);
  }

  // Session
  createSession(): Session {
    const id = generateRandomHash(8);
    if (this._sessionMap.has(id)) {
      throw new Error('[SessionManager] Session ID already in use');
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
    webSocketSessionToken: string,
    options?: SessionManagerJoinSessionOptions
  ) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (this._webSocketSessionTokenToSessionIdMap.has(webSocketSessionToken)) {
      throw new Error('Client has already joined a session');
    }

    const sessionClient = session.addClient(webSocketSessionToken, options?.displayName);

    this._webSocketSessionTokenToSessionIdMap.set(webSocketSessionToken, sessionId);

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

  getSessionForWebSocketSessionToken(webSocketSessionToken: string): Session | null {
    const sessionId = this._webSocketSessionTokenToSessionIdMap.get(webSocketSessionToken);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }
}

export const sessionManager = new SessionManager();
