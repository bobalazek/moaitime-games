import { WebSocket } from 'ws';

import { SessionTypeEnum, SessionTypePayloadMap } from '@moaitime-games/shared-common';

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

  onWebSocketConnection(webSocket: WebSocket, token: string, sessionId: string) {
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

    console.log(`[API] ✅ Client ${token} connected`);

    webSocket.on('message', (message: string) => this._onWebSocketMessage(token, message));
    webSocket.on('error', (error) => this._onWebSocketError(token, error));
    webSocket.on('close', () => this._onWebSocketClose(token));
  }

  sendToWebSocketClient(
    webSocketToken: string,
    type: SessionTypeEnum,
    payload: SessionTypePayloadMap[SessionTypeEnum]
  ) {
    const webSocket = this._webSocketMap.get(webSocketToken);
    if (!webSocket) {
      console.log(`[API] ❌ Client ${webSocketToken} not found`);
      return;
    }

    const message = JSON.stringify({ type, payload });

    console.log(`[API] 📩 Sending: ${message}`);

    webSocket.send(message);
  }

  _onWebSocketMessage(webSocketToken: string, message: string) {
    console.log(`[API] 📨 Received: ${message} from ${webSocketToken}`);

    this._webSocketLastActivityMap.set(webSocketToken, Date.now());

    sessionManager.onMessage(webSocketToken, message);
  }

  _onWebSocketError(webSocketToken: string, error: Error) {
    console.log(`[API] ❌ Client ${webSocketToken} errored: ${error.message}`);

    sessionManager.onError(webSocketToken, error);

    this._cleanupWebSocket(webSocketToken);
  }

  _onWebSocketClose(webSocketToken: string) {
    console.log(`[API] ❌ Client ${webSocketToken} closed`);

    sessionManager.onClose(webSocketToken);

    this._cleanupWebSocket(webSocketToken);
  }

  _cleanupWebSocket(webSocketToken: string) {
    this._webSocketMap.delete(webSocketToken);
    this._webSocketLastActivityMap.delete(webSocketToken);
  }
}

export const webSocketManager = new WebSocketManager();
