import { WebSocket } from 'ws';

import { generateRandomHash } from './Helpers';
import { sessionManager } from './SessionManager';

const GARBAGE_COLLECTION_INTERVAL = 5000;
const ISSUED_TOKEN_LIFETIME = 10000;
const STALE_WEB_SOCKET_LIFETIME = 30000;

export class WebSocketManager {
  private _webSocketMap: Map<string, WebSocket> = new Map();
  private _webSocketLastActivityMap: Map<string, number> = new Map();
  private _issuedTokenMap: Map<string, number> = new Map();

  constructor() {
    // Garbage collection
    setInterval(() => {
      const now = Date.now();

      for (const [webSocketToken, issuedAt] of this._issuedTokenMap) {
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

  issueToken() {
    const token = generateRandomHash(16);
    if (this._issuedTokenMap.has(token)) {
      throw new Error('Token already in use');
    }

    this._issuedTokenMap.set(token, Date.now());

    return token;
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

    this._issuedTokenMap.delete(token);
    this._webSocketMap.set(token, webSocket);
    this._webSocketLastActivityMap.set(token, Date.now());

    sessionManager.joinSession(sessionId, token);

    console.log(`[API] ✅ Client with token ${token} connected`);

    webSocket.on('message', (message: string) => this._onMessage(token, message));
    webSocket.on('error', (error) => this._onError(token, error));
    webSocket.on('close', () => this._onClose(token));
  }

  getWebSocketByToken(webSocketToken: string) {
    return this._webSocketMap.get(webSocketToken) ?? null;
  }

  _onMessage(webSocketToken: string, message: string) {
    console.log(`[API] 📨 Received: ${message} from token ${webSocketToken}`);

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
