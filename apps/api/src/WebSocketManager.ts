import { WebSocket } from 'ws';

import { generateRandomHash } from './Helpers';
import { sessionManager } from './SessionManager';

const GARBAGE_COLLECTION_INTERVAL = 5000;
const ISSUED_TOKEN_LIFETIME = 10000;
const STALE_WEB_SOCKET_LIFETIME = 30000;

export class WebSocketManager {
  private _webSocketMap: Map<string, WebSocket> = new Map();
  private _webSocketLastActivityMap: Map<string, number> = new Map();
  private _issuedTokenMap: Map<
    string,
    { issuedAt: number; additionalData?: Record<string, unknown> }
  > = new Map();

  constructor() {
    // Garbage collection
    setInterval(() => {
      const now = Date.now();

      for (const [webSocketToken, { issuedAt }] of this._issuedTokenMap) {
        if (now - issuedAt > ISSUED_TOKEN_LIFETIME) {
          console.log(`[API] ❌ Client ${webSocketToken} token expired`);

          this._issuedTokenMap.delete(webSocketToken);
        }
      }

      for (const [webSocketToken, lastActivityAt] of this._webSocketLastActivityMap) {
        if (now - lastActivityAt > STALE_WEB_SOCKET_LIFETIME) {
          console.log(`[API] ❌ Client ${webSocketToken} timed out`);

          sessionManager.onClose(webSocketToken);

          this._cleanupWebSocket(webSocketToken);
        }
      }
    }, GARBAGE_COLLECTION_INTERVAL);
  }

  issueToken(additionalData?: Record<string, unknown>) {
    const token = generateRandomHash(16);
    if (this._issuedTokenMap.has(token)) {
      throw new Error('Token already in use');
    }

    this._issuedTokenMap.set(token, { issuedAt: Date.now(), additionalData });

    console.log(`[API] ✅ Client ${token} token issued`);

    return token;
  }

  updateIssuedToken(token: string, additionalData?: Record<string, unknown>) {
    if (!this._issuedTokenMap.has(token)) {
      throw new Error('Token not issued');
    }

    this._issuedTokenMap.set(token, { issuedAt: Date.now(), additionalData });

    console.log(`[API] ✅ Client ${token} token updated`);
  }

  redeemToken(token: string) {
    if (!this._issuedTokenMap.has(token)) {
      throw new Error('Token not issued');
    }

    const { additionalData } = this._issuedTokenMap.get(token) ?? {};
    this._issuedTokenMap.delete(token);

    console.log(`[API] ✅ Client ${token} token redeemed`);

    return additionalData;
  }

  onConnection(webSocket: WebSocket, token: string, sessionId: string) {
    if (!token) {
      console.log('[API] ❌ No client token provided');
      return;
    }

    if (!this._issuedTokenMap.has(token)) {
      console.log(`[API] ❌ Client ${token} token not issued`);
      return;
    }

    const session = sessionManager.getSession(sessionId);
    if (!session) {
      console.log(`[API] ❌ Session ${sessionId} not found`);
      return;
    }

    const redeemedTokenData = this.redeemToken(token);

    this._webSocketMap.set(token, webSocket);
    this._webSocketLastActivityMap.set(token, Date.now());

    sessionManager.joinSession(sessionId, token, redeemedTokenData);

    console.log(
      `[API] ✅ Client with token ${token} connected (additionalData: ${JSON.stringify(redeemedTokenData)})`
    );

    webSocket.on('message', (message: string) => this._onMessage(token, message));
    webSocket.on('error', (error) => this._onError(token, error));
    webSocket.on('close', () => this._onClose(token));
  }

  getWebSocketByToken(webSocketToken: string) {
    return this._webSocketMap.get(webSocketToken) ?? null;
  }

  _onMessage(webSocketToken: string, message: string) {
    this._webSocketLastActivityMap.set(webSocketToken, Date.now());

    sessionManager.onMessage(webSocketToken, message);
  }

  _onError(webSocketToken: string, error: Error) {
    console.log(`[API] ❌ Client with token ${webSocketToken} errored: ${error.message}`);

    sessionManager.onError(webSocketToken, error);

    this._cleanupWebSocket(webSocketToken);
  }

  _onClose(webSocketToken: string) {
    console.log(`[API] ❌ Client with token ${webSocketToken} closed`);

    sessionManager.onClose(webSocketToken);

    this._cleanupWebSocket(webSocketToken);
  }

  _cleanupWebSocket(webSocketToken: string) {
    const webSocket = this._webSocketMap.get(webSocketToken);
    if (webSocket && webSocket.readyState === WebSocket?.OPEN) {
      webSocket.terminate();
    }

    this._webSocketMap.delete(webSocketToken);
    this._webSocketLastActivityMap.delete(webSocketToken);
  }
}

export const webSocketManager = new WebSocketManager();
