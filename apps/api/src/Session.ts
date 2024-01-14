import { diff } from 'just-diff';

import {
  DevicePlatformEnum,
  DeviceTypeEnum,
  serializer,
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
} from '@moaitime-games/shared-common';

import { generateRandomHash } from './Helpers';
import { webSocketManager } from './WebSocketManager';

export class Session {
  private _isStarted: boolean = false;
  private _state: SessionInterface;
  private _fps: number = 60;

  constructor(id: string, accessCode: string) {
    this._state = {
      id,
      accessCode,
      createdAt: Date.now(),
      clients: new Map(),
    };

    this.start();
  }

  start() {
    if (this._isStarted) {
      return;
    }

    console.log(`[API] 🚀 Session ${this._state.id} started`);

    // Starting the game loop

    this._isStarted = true;

    let lastState: SessionInterface | null = null;
    setInterval(() => {
      let doFullUpdate = false;

      const state = this.getState();

      if (!lastState) {
        doFullUpdate = true;

        lastState = state;
      } else {
        const delta = diff(lastState, state);
        if (delta.length > 0) {
          doFullUpdate = true;

          lastState = state;
        }
      }

      if (doFullUpdate) {
        this.sendToAllSessionClients(SessionTypeEnum.FULL_STATE_UPDATE, state);
      }

      // TODO: implement delta updates
    }, 1000 / this._fps);
  }

  dispose() {
    // TODO
  }

  onMessage(webSocketToken: string, message: unknown) {
    const data = serializer.deserialize(message as string) as { type: string; payload: unknown };

    const { type, payload } = data;

    if (type === 'ping') {
      this.onClientPing(webSocketToken);
    }
  }

  getState() {
    return this._state;
  }

  setState(session: SessionInterface) {
    this._state = session;
  }

  createClient(
    webSocketToken: string,
    displayName: string,
    deviceType: DeviceTypeEnum = DeviceTypeEnum.UNKNOWN,
    devicePlatform: DevicePlatformEnum = DevicePlatformEnum.UNKNOWN
  ) {
    const id = generateRandomHash(8);
    const now = Date.now();

    const sessionClient: SessionClientInterface = {
      id,
      webSocketToken,
      displayName,
      deviceType,
      devicePlatform,
      connectedAt: now,
      disconnectedAt: 0,
      lastPingAt: now,
    };

    return sessionClient;
  }

  addClient(sessionClient: SessionClientInterface) {
    console.log(`[API] 📥 Client with ID ${sessionClient.id} added to session ${this._state.id}`);

    this._state.clients.set(sessionClient.id, sessionClient);
  }

  sendToSessionClient(sessionClientId: string, type: string, payload: unknown): void {
    const sessionClient = this._state.clients.get(sessionClientId);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with ID ${sessionClientId} not found`);

      return;
    }

    const webSocket = webSocketManager.getWebSocketByToken(sessionClient.webSocketToken);
    if (!webSocket) {
      console.log(`[API] ❌ WebSocket with token ${sessionClient.webSocketToken} not found`);

      return;
    }

    const message = serializer.serialize({ type, payload });

    console.log(`[API] 📩 Sending: ${message}`);

    webSocket.send(message);
  }

  sendToAllSessionClients(type: string, payload: unknown): void {
    for (const [, sessionClient] of this._state.clients) {
      this.sendToSessionClient(sessionClient.id, type, payload);
    }
  }

  // Events
  onClientPing(webSocketToken: string) {
    const sessionClient = this.getClientByWebSocketToken(webSocketToken);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with token ${webSocketToken} not found`);

      return;
    }

    sessionClient.lastPingAt = Date.now();

    this._state.clients.set(sessionClient.id, sessionClient);
  }

  // Helpers
  getClientByWebSocketToken(webSocketToken: string): SessionClientInterface | null {
    // TODO: must cache that!

    for (const [, sessionClient] of this._state.clients) {
      if (sessionClient.webSocketToken === webSocketToken) {
        return sessionClient;
      }
    }

    return null;
  }
}
