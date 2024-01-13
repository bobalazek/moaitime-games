import { Request } from 'express';
import { WebSocket } from 'ws';

import { SessionTypeEnum, SessionTypePayloadMap } from '@moaitime-games/shared-common';

import { SessionManager } from './SessionManager';

export class WebSocketManager {
  private _webSocketClientMap: Map<string, WebSocket> = new Map();

  initWebSocketConnection(ws: WebSocket, req: Request, sessionManager: SessionManager) {
    const webSocketClientId = req.headers['sec-websocket-key'] as string;

    this.setWebSocketClient(webSocketClientId, ws);

    console.log(`[API] ✅ Client ${webSocketClientId} connected`);

    ws.on('message', (message: string) => {
      console.log(`[API] 📨 Received: ${message} from ${webSocketClientId}`);

      sessionManager.onMessage(webSocketClientId, message);
    });

    ws.on('error', (error: Error) => {
      console.log(`[API] ❌ Client ${webSocketClientId} errored: ${error}`);

      sessionManager.onError(webSocketClientId, error);
    });

    ws.on('close', () => {
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
