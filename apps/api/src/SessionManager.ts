import { WebSocket } from 'ws';

import { generateRandomHash } from './Helpers';
import { Session } from './Session';

export type SessionManagerJoinSessionOptions = {
  displayName?: string;
};

const GARBAGE_COLLECTION_INTERVAL = 5000;
const ISSUED_TOKEN_LIFETIME = 10000;
const STALE_WEB_SOCKET_LIFETIME = 30000;

export class SessionManager {
  // The map of all active sessions
  private _sessionMap: Map<string, Session> = new Map();

  // The issued session tokens that are needed when joining a session
  private _sessionTokensMap: Map<string, { issuedAt: number; data?: Record<string, unknown> }> =
    new Map();

  // A cached map of all the current
  private _sessionAccessCodeCacheMap: Map<string, string> = new Map();

  // A map of all the current websocket connections
  private _webSocketMap: Map<string, WebSocket> = new Map();

  // A map of all the current websocket connections and their last activity
  private _webSocketLastActivityMap: Map<string, number> = new Map();

  // A cached map of all the websocket/session tokens, that are currently connected to a session
  private _webSocketSessionTokenToSessionIdCacheMap: Map<string, string> = new Map();

  constructor() {
    this.init();
  }

  init() {
    // Garbage collection
    setInterval(() => {
      const now = Date.now();

      for (const [webSocketSessionToken, { issuedAt }] of this._sessionTokensMap) {
        if (now - issuedAt > ISSUED_TOKEN_LIFETIME) {
          console.log(`[SessionManager] Client "${webSocketSessionToken}" token expired`);

          this._sessionTokensMap.delete(webSocketSessionToken);
        }
      }

      for (const [webSocketSessionToken, lastActivityAt] of this._webSocketLastActivityMap) {
        if (now - lastActivityAt > STALE_WEB_SOCKET_LIFETIME) {
          console.log(`[SessionManager] Client "${webSocketSessionToken}" timed out`);

          sessionManager.onClose(webSocketSessionToken);

          this._cleanupWebSocket(webSocketSessionToken);
        }
      }
    }, GARBAGE_COLLECTION_INTERVAL);

    // TODO: loop through each session and determine if it's stale
  }

  // Events
  onConnection(webSocket: WebSocket, sessionToken: string, sessionId: string) {
    if (!sessionToken) {
      console.log('[SessionManager] No session token provided');
      return;
    }

    if (!this._sessionTokensMap.has(sessionToken)) {
      console.log(`[SessionManager] Client "${sessionToken}" session token not issued`);
      return;
    }

    const session = this.getSession(sessionId);
    if (!session) {
      console.log(`[SessionManager] Session with id "${sessionId}" not found`);
      return;
    }

    const redeemedTokenData = this.redeemSessionToken(sessionToken);

    this._webSocketMap.set(sessionToken, webSocket);
    this._webSocketLastActivityMap.set(sessionToken, Date.now());

    this.joinSession(sessionId, sessionToken, redeemedTokenData);

    console.log(
      `[SessionManager] Client with session token "${sessionToken}" connected (data: ${JSON.stringify(redeemedTokenData)})`
    );

    webSocket.on('message', (message: string) => this.onMessage(sessionToken, message));
    webSocket.on('error', (error) => this.onError(sessionToken, error));
    webSocket.on('close', () => this.onClose(sessionToken));
  }

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
  }

  onClose(webSocketSessionToken: string) {
    const session = this.getSessionForWebSocketSessionToken(webSocketSessionToken);
    if (!session) {
      return;
    }

    session.onClose(webSocketSessionToken);
  }

  // Session Tokens
  issueSessionToken(data?: Record<string, unknown>) {
    const token = generateRandomHash(16);
    if (this._sessionTokensMap.has(token)) {
      throw new Error('Session token already in use');
    }

    this._sessionTokensMap.set(token, { issuedAt: Date.now(), data });

    console.log(`[SessionManager] Client session token "${token}" issued`);

    return token;
  }

  updateSessionToken(sessionToken: string, data?: Record<string, unknown>) {
    if (!this._sessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    this._sessionTokensMap.set(sessionToken, { issuedAt: Date.now(), data });

    console.log(`[SessionManager] Client session token "${sessionToken}" updated`);
  }

  redeemSessionToken(sessionToken: string) {
    if (!this._sessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    const { data } = this._sessionTokensMap.get(sessionToken) ?? {};
    this._sessionTokensMap.delete(sessionToken);

    console.log(`[SessionManager] Client "${sessionToken}" session token redeemed`);

    return data;
  }

  getWebSocketBySessionToken(webSocketSessionToken: string) {
    return this._webSocketMap.get(webSocketSessionToken) ?? null;
  }

  // Session
  createSession(): Session {
    const id = generateRandomHash(8);
    if (this._sessionMap.has(id)) {
      throw new Error('Session ID already in use');
    }

    const accessCode = Math.floor(Math.random() * 899999 + 100000).toString();
    if (this._sessionAccessCodeCacheMap.has(accessCode)) {
      throw new Error('Access code already in use');
    }

    const session = new Session(id, accessCode);

    session.onTerminated(() => {
      console.log(`[SessionManager] Session "${id}" terminated`);

      this._sessionMap.delete(id);
      this._sessionAccessCodeCacheMap.delete(accessCode);
    });

    this._sessionMap.set(id, session);
    this._sessionAccessCodeCacheMap.set(accessCode, id);

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

    if (this._webSocketSessionTokenToSessionIdCacheMap.has(webSocketSessionToken)) {
      throw new Error('Client has already joined a session');
    }

    const sessionClient = session.addClient(webSocketSessionToken, options?.displayName);

    this._webSocketSessionTokenToSessionIdCacheMap.set(webSocketSessionToken, sessionId);

    return sessionClient;
  }

  getSession(sessionId: string): Session | null {
    return this._sessionMap.get(sessionId) ?? null;
  }

  getSessionByAccessCode(sessionAccessCode: string): Session | null {
    const sessionId = this._sessionAccessCodeCacheMap.get(sessionAccessCode);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  getSessionForWebSocketSessionToken(webSocketSessionToken: string): Session | null {
    const sessionId = this._webSocketSessionTokenToSessionIdCacheMap.get(webSocketSessionToken);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  // Private
  _cleanupWebSocket(webSocketSessionToken: string) {
    const webSocket = this._webSocketMap.get(webSocketSessionToken);
    if (webSocket && webSocket.readyState === 1 /*WebSocket.OPEN*/) {
      // For some reason, WebSocket.OPEN is not defined in the ws package on runtime. Strange stuff.
      webSocket.terminate();
    }

    this._webSocketMap.delete(webSocketSessionToken);
    this._webSocketLastActivityMap.delete(webSocketSessionToken);
    this._webSocketSessionTokenToSessionIdCacheMap.delete(webSocketSessionToken);
  }
}

export const sessionManager = new SessionManager();
