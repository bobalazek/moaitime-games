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

  // A cached map of all the current
  private _sessionAccessCodeCacheMap: Map<string, string> = new Map();

  // A map of all the current websocket connections
  private _clientsMap: Map<string, WebSocket> = new Map();

  // A map of all the current websocket connections and their last activity
  private _clientsLastActivityMap: Map<string, number> = new Map();

  // The issued session tokens that are needed when joining a session
  private _clientSessionTokensMap: Map<
    string,
    { issuedAt: number; data?: Record<string, unknown> }
  > = new Map();

  // A cached map of all the websocket/session tokens, that are currently connected to a session
  private _clientSessionTokenToSessionIdCacheMap: Map<string, string> = new Map();

  constructor() {
    this.init();
  }

  init() {
    // Garbage collection
    setInterval(() => {
      const now = Date.now();

      for (const [clientSessionToken, { issuedAt }] of this._clientSessionTokensMap) {
        if (now - issuedAt > ISSUED_TOKEN_LIFETIME) {
          console.log(`[SessionManager] Client "${clientSessionToken}" token expired`);

          this._clientSessionTokensMap.delete(clientSessionToken);
        }
      }

      for (const [clientSessionToken, lastActivityAt] of this._clientsLastActivityMap) {
        if (now - lastActivityAt > STALE_WEB_SOCKET_LIFETIME) {
          console.log(`[SessionManager] Client "${clientSessionToken}" timed out`);

          sessionManager.onClose(clientSessionToken);

          this._cleanupClient(clientSessionToken);
        }
      }
    }, GARBAGE_COLLECTION_INTERVAL);

    // TODO: loop through each session and determine if it's stale
  }

  // Events
  onConnection(client: WebSocket, sessionToken: string, sessionId: string) {
    if (!sessionToken) {
      console.log('[SessionManager] No session token provided');
      return;
    }

    if (!this._clientSessionTokensMap.has(sessionToken)) {
      console.log(`[SessionManager] Client "${sessionToken}" session token not issued`);
      return;
    }

    const session = this.getSession(sessionId);
    if (!session) {
      console.log(`[SessionManager] Session with id "${sessionId}" not found`);
      return;
    }

    const redeemedTokenData = this.redeemSessionToken(sessionToken);

    this._clientsMap.set(sessionToken, client);
    this._clientsLastActivityMap.set(sessionToken, Date.now());

    this.joinSession(sessionId, sessionToken, redeemedTokenData);

    console.log(
      `[SessionManager] Client with session token "${sessionToken}" connected (data: ${JSON.stringify(redeemedTokenData)})`
    );

    client.on('message', (message: string) => this.onMessage(sessionToken, message));
    client.on('error', (error) => this.onError(sessionToken, error));
    client.on('close', () => this.onClose(sessionToken));
  }

  onMessage(clientSessionToken: string, message: string) {
    const session = this.getSessionForClientSessionToken(clientSessionToken);
    if (!session) {
      return;
    }

    session.onMessage(clientSessionToken, message);
  }

  onError(clientSessionToken: string, error: Error) {
    const session = this.getSessionForClientSessionToken(clientSessionToken);
    if (!session) {
      return;
    }

    session.onError(clientSessionToken, error);
  }

  onClose(clientSessionToken: string) {
    const session = this.getSessionForClientSessionToken(clientSessionToken);
    if (!session) {
      return;
    }

    session.onClose(clientSessionToken);
  }

  // Session Tokens
  issueSessionToken(data?: Record<string, unknown>) {
    const token = generateRandomHash(16);
    if (this._clientSessionTokensMap.has(token)) {
      throw new Error('Session token already in use');
    }

    this._clientSessionTokensMap.set(token, { issuedAt: Date.now(), data });

    console.log(`[SessionManager] Client session token "${token}" issued`);

    return token;
  }

  updateSessionToken(sessionToken: string, data?: Record<string, unknown>) {
    if (!this._clientSessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    this._clientSessionTokensMap.set(sessionToken, { issuedAt: Date.now(), data });

    console.log(`[SessionManager] Client session token "${sessionToken}" updated`);
  }

  redeemSessionToken(sessionToken: string) {
    if (!this._clientSessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    const { data } = this._clientSessionTokensMap.get(sessionToken) ?? {};
    this._clientSessionTokensMap.delete(sessionToken);

    console.log(`[SessionManager] Client "${sessionToken}" session token redeemed`);

    return data;
  }

  getClientBySessionToken(clientSessionToken: string) {
    return this._clientsMap.get(clientSessionToken) ?? null;
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
    clientSessionToken: string,
    options?: SessionManagerJoinSessionOptions
  ) {
    const session = this.getSession(sessionId);
    if (!session) {
      throw new Error('Session not found');
    }

    if (this._clientSessionTokenToSessionIdCacheMap.has(clientSessionToken)) {
      throw new Error('Client has already joined a session');
    }

    const sessionClient = session.addClient(clientSessionToken, options?.displayName);

    this._clientSessionTokenToSessionIdCacheMap.set(clientSessionToken, sessionId);

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

  getSessionForClientSessionToken(clientSessionToken: string): Session | null {
    const sessionId = this._clientSessionTokenToSessionIdCacheMap.get(clientSessionToken);
    if (!sessionId) {
      return null;
    }

    return this.getSession(sessionId);
  }

  // Private
  _cleanupClient(clientSessionToken: string) {
    const client = this._clientsMap.get(clientSessionToken);
    if (client && client.readyState === 1 /*WebSocket.OPEN*/) {
      // For some reason, WebSocket.OPEN is not defined in the ws package on runtime. Strange stuff.
      client.terminate();
    }

    this._clientsMap.delete(clientSessionToken);
    this._clientsLastActivityMap.delete(clientSessionToken);
    this._clientSessionTokenToSessionIdCacheMap.delete(clientSessionToken);
  }
}

export const sessionManager = new SessionManager();
