import { WebSocket } from 'ws';

import { generateRandomHash } from './Helpers';
import { sessionManager } from './SessionManager';

const GARBAGE_COLLECTION_INTERVAL = 5000;
const ISSUED_TOKEN_LIFETIME = 10000;
const STALE_WEB_SOCKET_LIFETIME = 30000;

export class WebSocketManager {
  private _webSocketMap: Map<string, WebSocket> = new Map();
  private _webSocketLastActivityMap: Map<string, number> = new Map();
  private _sessionTokensMap: Map<string, { issuedAt: number; data?: Record<string, unknown> }> =
    new Map();

  constructor() {
    this.init();
  }

  init() {
    // Garbage collection
    setInterval(() => {
      const now = Date.now();

      for (const [webSocketSessionToken, { issuedAt }] of this._sessionTokensMap) {
        if (now - issuedAt > ISSUED_TOKEN_LIFETIME) {
          console.log(`[WebSocketManager] Client "${webSocketSessionToken}" token expired`);

          this._sessionTokensMap.delete(webSocketSessionToken);
        }
      }

      for (const [webSocketSessionToken, lastActivityAt] of this._webSocketLastActivityMap) {
        if (now - lastActivityAt > STALE_WEB_SOCKET_LIFETIME) {
          console.log(`[WebSocketManager] Client "${webSocketSessionToken}" timed out`);

          sessionManager.onClose(webSocketSessionToken);

          this._cleanupWebSocket(webSocketSessionToken);
        }
      }
    }, GARBAGE_COLLECTION_INTERVAL);
  }

  issueSessionToken(data?: Record<string, unknown>) {
    const token = generateRandomHash(16);
    if (this._sessionTokensMap.has(token)) {
      throw new Error('Session token already in use');
    }

    this._sessionTokensMap.set(token, { issuedAt: Date.now(), data });

    console.log(`[WebSocketManager] Client session token "${token}" issued`);

    return token;
  }

  updateSessionToken(sessionToken: string, data?: Record<string, unknown>) {
    if (!this._sessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    this._sessionTokensMap.set(sessionToken, { issuedAt: Date.now(), data });

    console.log(`[WebSocketManager] Client session token "${sessionToken}" updated`);
  }

  redeemSessionToken(sessionToken: string) {
    if (!this._sessionTokensMap.has(sessionToken)) {
      throw new Error('Session token not issued');
    }

    const { data } = this._sessionTokensMap.get(sessionToken) ?? {};
    this._sessionTokensMap.delete(sessionToken);

    console.log(`[WebSocketManager] Client "${sessionToken}" session token redeemed`);

    return data;
  }

  onConnection(webSocket: WebSocket, sessionToken: string, sessionId: string) {
    if (!sessionToken) {
      console.log('[WebSocketManager] No session token provided');
      return;
    }

    if (!this._sessionTokensMap.has(sessionToken)) {
      console.log(`[WebSocketManager] Client "${sessionToken}" session token not issued`);
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.log(`[WebSocketManager] Session with id "${sessionId}" not found`);
      return;
    }

    const redeemedTokenData = this.redeemSessionToken(sessionToken);

    this._webSocketMap.set(sessionToken, webSocket);
    this._webSocketLastActivityMap.set(sessionToken, Date.now());

    sessionManager.joinSession(sessionId, sessionToken, redeemedTokenData);

    console.log(
      `[WebSocketManager] Client with session token "${sessionToken}" connected (data: ${JSON.stringify(redeemedTokenData)})`
    );

    webSocket.on('message', (message: string) => this._onMessage(sessionToken, message));
    webSocket.on('error', (error) => this._onError(sessionToken, error));
    webSocket.on('close', () => this._onClose(sessionToken));
  }

  getWebSocketBySessionToken(webSocketSessionToken: string) {
    return this._webSocketMap.get(webSocketSessionToken) ?? null;
  }

  // Private
  _onMessage(webSocketSessionToken: string, message: string) {
    this._webSocketLastActivityMap.set(webSocketSessionToken, Date.now());

    sessionManager.onMessage(webSocketSessionToken, message);
  }

  _onError(webSocketSessionToken: string, error: Error) {
    console.log(
      `[WebSocketManager] Client with token "${webSocketSessionToken}" errored: "${error.message}"`
    );

    sessionManager.onError(webSocketSessionToken, error);

    this._cleanupWebSocket(webSocketSessionToken);
  }

  _onClose(webSocketSessionToken: string) {
    console.log(`[WebSocketManager] Client with token "${webSocketSessionToken}" closed`);

    sessionManager.onClose(webSocketSessionToken);

    this._cleanupWebSocket(webSocketSessionToken);
  }

  _cleanupWebSocket(webSocketSessionToken: string) {
    const webSocket = this._webSocketMap.get(webSocketSessionToken);
    if (webSocket && webSocket.readyState === 1 /*WebSocket.OPEN*/) {
      // For some reason, WebSocket.OPEN is not defined in the ws package on runtime. Strange stuff.
      webSocket.terminate();
    }

    this._webSocketMap.delete(webSocketSessionToken);
    this._webSocketLastActivityMap.delete(webSocketSessionToken);
  }
}

export const webSocketManager = new WebSocketManager();
