import { Request } from 'express';
import { WebSocket } from 'ws';

import { SessionTypeEnum, SessionTypePayloadMap } from '@moaitime-games/shared-common';

import { SessionManager } from './SessionManager';

export class WebSocketManager {
  private _webSocketClientMap: Map<string, WebSocket> = new Map();

  addWebSocketConnection(webSocket: WebSocket, request: Request, sessionManager: SessionManager) {
    const webSocketClientId = request.headers['sec-websocket-key'] as string;
    if (!webSocketClientId) {
      console.log('[API] ❌ No client id');
      return;
    }

    this.setWebSocketClient(webSocketClientId, webSocket);

    console.log(`[API] ✅ Client ${webSocketClientId} connected`);

    webSocket.on('message', (message: string) => {
      console.log(`[API] 📨 Received: ${message} from ${webSocketClientId}`);

      sessionManager.onMessage(webSocketClientId, message);
    });

    webSocket.on('error', (error: Error) => {
      console.log(`[API] ❌ Client ${webSocketClientId} errored: ${error}`);

      sessionManager.onError(webSocketClientId, error);

      this.deleteWebSocketClient(webSocketClientId);
    });

    webSocket.on('close', () => {
      console.log(`[API] ❌ Client ${webSocketClientId} disconnected`);

      sessionManager.onClose(webSocketClientId);

      this.deleteWebSocketClient(webSocketClientId);
    });
  }

  getWebSocketClient(webSocketClientId: string) {
    return this._webSocketClientMap.get(webSocketClientId);
  }

  setWebSocketClient(webSocketClientId: string, ws: WebSocket) {
    this._webSocketClientMap.set(webSocketClientId, ws);
  }

  deleteWebSocketClient(webSocketClientId: string) {
    this._webSocketClientMap.delete(webSocketClientId);
  }

  sendToWebSocketClient(
    websocketClientId: string,
    type: SessionTypeEnum,
    payload: SessionTypePayloadMap[SessionTypeEnum]
  ) {
    const ws = this._webSocketClientMap.get(websocketClientId);
    if (!ws) {
      console.log(`[API] ❌ Client ${websocketClientId} not found`);
      return;
    }

    const message = JSON.stringify({ type, payload });

    console.log(`[API] 📩 Sending: ${message}`);

    ws.send(message);
  }
}

export const webSocketManager = new WebSocketManager();
