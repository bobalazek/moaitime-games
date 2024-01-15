import { compare } from 'fast-json-patch';

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

const PING_INTERVAL = 2000;
const STATE_UPDATE_FPS = 60;

export class Session {
  private _isStarted: boolean = false;
  private _state: SessionInterface;

  private _lastPingTimes: Map<string, number> = new Map();
  private _lastPongTimes: Map<string, number> = new Map();

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

    let lastRawState: SessionInterface | null = null;
    setInterval(() => {
      let doFullUpdate = false;

      const state = this.getState();
      const rawState = this._toRawJson(state);

      if (!lastRawState) {
        doFullUpdate = true;

        lastRawState = rawState;
      } else {
        const delta = compare(lastRawState, rawState);
        if (delta.length > 0) {
          doFullUpdate = true;

          lastRawState = rawState;
        }
      }

      if (doFullUpdate) {
        this.sendToAllSessionClients(SessionTypeEnum.FULL_STATE_UPDATE, state);
      }

      // TODO: implement delta updates
    }, 1000 / STATE_UPDATE_FPS);

    // Starting the ping loop
    setInterval(() => {
      this._sendPingToAllClients();
    }, PING_INTERVAL);
  }

  dispose() {
    // TODO
  }

  // Events
  onMessage(webSocketToken: string, message: unknown) {
    const data = serializer.deserialize(message as string) as { type: string; payload: unknown };

    const { type, payload } = data;

    if (type === SessionTypeEnum.PONG) {
      this.onPongMessage(webSocketToken);
    }
  }

  onError(webSocketToken: string, error: Error) {
    const sessionClient = this.getClientByWebSocketToken(webSocketToken);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with token ${webSocketToken} not found`);

      return;
    }

    this._state.clients.delete(sessionClient.id);
  }

  onClose(webSocketToken: string) {
    const sessionClient = this.getClientByWebSocketToken(webSocketToken);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with token ${webSocketToken} not found`);

      return;
    }

    this._state.clients.delete(sessionClient.id);
  }

  // Session Events
  onPongMessage(webSocketToken: string) {
    const sessionClient = this.getClientByWebSocketToken(webSocketToken);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with token ${webSocketToken} not found`);

      return;
    }

    const pongAt = Date.now();

    this._lastPongTimes.set(sessionClient.id, pongAt);

    const lastPingAt = this._lastPingTimes.get(sessionClient.id);
    const ping = lastPingAt ? pongAt - lastPingAt : 0;

    sessionClient.ping = ping > PING_INTERVAL ? PING_INTERVAL : ping;

    this._state.clients.set(sessionClient.id, sessionClient);
  }

  // State
  getState() {
    return this._state;
  }

  setState(session: SessionInterface) {
    this._state = session;
  }

  updateState(session: Partial<SessionInterface>) {
    this._state = {
      ...this._state,
      ...session,
    };
  }

  // Clients
  addClient(webSocketToken: string, displayName?: string) {
    console.log(`[API] 📥 Client with token ${webSocketToken} added to session ${this._state.id}`);

    if (!displayName) {
      displayName = `Player ${this._state.clients.size + 1}`;
    }

    const isHost = this._state.clients.size === 0;
    const isFirstPlayerBesidesHost = this._state.clients.size === 1;

    if (isHost) {
      displayName = 'Host';
    }

    if (!displayName) {
      throw new Error('Display name not provided');
    }

    const id = generateRandomHash(8);
    const now = Date.now();
    const deviceType = DeviceTypeEnum.UNKNOWN;
    const devicePlatform = DevicePlatformEnum.UNKNOWN;

    const sessionClient: SessionClientInterface = {
      id,
      webSocketToken,
      displayName,
      deviceType,
      devicePlatform,
      connectedAt: now,
      disconnectedAt: 0,
      ping: 0,
    };

    this._state.clients.set(sessionClient.id, sessionClient);

    if (isHost) {
      this.updateState({
        hostClientId: sessionClient.id,
      });
    } else if (isFirstPlayerBesidesHost) {
      this.updateState({
        controllerClientId: sessionClient.id,
      });
    }

    return sessionClient;
  }

  // Messages
  sendToSessionClient(sessionClientId: string, type: string, payload: unknown): void {
    const sessionClient = this._state.clients.get(sessionClientId);
    if (!sessionClient) {
      console.log(`[API] ❌ Client with ID ${sessionClientId} not found`);

      return;
    }

    const webSocket = webSocketManager.getWebSocketByToken(sessionClient.webSocketToken);
    if (!webSocket) {
      console.log(`[API] ❌ Client with token ${sessionClient.webSocketToken} not found`);

      return;
    }

    const message = serializer.serialize({ type, payload });

    webSocket.send(message);
  }

  sendToAllSessionClients(type: string, payload: unknown): void {
    console.log(`[API] 📩 Sending to all clients: ${type}`);

    for (const [, sessionClient] of this._state.clients) {
      this.sendToSessionClient(sessionClient.id, type, payload);
    }
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

  // Private
  /**
   * We need this to convert the session object to fully raw json for comparison,
   * which means that we need to convert the map to a record and set to an array.
   * It should do it recursively.
   */
  private _toRawJson(schema: SessionInterface): SessionInterface {
    return JSON.parse(serializer.serialize(schema));
  }

  // Ping
  private _sendPingToAllClients() {
    const now = Date.now();
    for (const [, sessionClient] of this._state.clients) {
      this._lastPingTimes.set(sessionClient.id, now);

      this.sendToSessionClient(sessionClient.id, SessionTypeEnum.PING, {
        serverTime: now,
      });
    }
  }
}
