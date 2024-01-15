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
import { sessionManager } from './SessionManager';

const PING_INTERVAL = 2000;
const STATE_UPDATE_FPS = 60;

export class Session {
  private _lastPingTimes: Map<string, number> = new Map();
  private _lastPongTimes: Map<string, number> = new Map();

  private _state: SessionInterface;

  constructor(id: string, accessCode: string) {
    this._state = {
      id,
      accessCode,
      createdAt: Date.now(),
      clients: new Map(),
    };

    this.init();
  }

  init() {
    console.log(`[Session] Session "${this._state.id}" initializing ...`);

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

    setTimeout(() => {
      this.terminate();
    }, 5000);
  }

  get id() {
    return this._state.id;
  }

  get accessCode() {
    return this._state.accessCode;
  }

  terminate() {
    console.log(`[Session] Session "${this._state.id}" terminating ...`);

    // TODO
  }

  // Events
  onMessage(webSocketSessionToken: string, message: unknown) {
    const data = serializer.deserialize(message as string) as { type: string; payload: unknown };

    const { type, payload } = data;

    if (type === SessionTypeEnum.PONG) {
      this.onPongMessage(webSocketSessionToken);
    }
  }

  onError(webSocketSessionToken: string, error: Error) {
    this.removeClient(webSocketSessionToken);
  }

  onClose(webSocketSessionToken: string) {
    this.removeClient(webSocketSessionToken);
  }

  // Session Events
  onPongMessage(webSocketSessionToken: string) {
    const sessionClient = this.getClient(webSocketSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${webSocketSessionToken}" not found in session "${this.id}"`
      );

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
  addClient(webSocketSessionToken: string, displayName?: string) {
    console.log(
      `[Session] Adding client with token "${webSocketSessionToken}" to session "${this.id}" ...`
    );

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
      webSocketSessionToken,
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

  removeClient(webSocketSessionToken: string) {
    console.log(
      `[Session] Removing client with token "${webSocketSessionToken}" from session "${this.id}" ...`
    );

    const sessionClient = this.getClient(webSocketSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${webSocketSessionToken}" not found in session "${this.id}"`
      );

      return;
    }

    this._state.clients.delete(sessionClient.id);
  }

  getClient(webSocketSessionToken: string): SessionClientInterface | null {
    // TODO: must cache that!

    for (const [, sessionClient] of this._state.clients) {
      if (sessionClient.webSocketSessionToken !== webSocketSessionToken) {
        continue;
      }

      return sessionClient;
    }

    return null;
  }

  // Messages
  sendToSessionClient(sessionClientId: string, type: string, payload: unknown): void {
    const sessionClient = this._state.clients.get(sessionClientId);
    if (!sessionClient) {
      console.log(`[Session] Client with ID ${sessionClientId} not found in session ${this.id}`);

      return;
    }

    const webSocket = sessionManager.getWebSocketBySessionToken(
      sessionClient.webSocketSessionToken
    );
    if (!webSocket) {
      console.log(
        `[Session] Client with token "${sessionClient.webSocketSessionToken}" not found in session "${this.id}"`
      );

      return;
    }

    console.log(
      `[Session] Sending "${type}" to client "${sessionClient.id}" in session "${this.id}" ...`
    );

    const message = serializer.serialize({ type, payload });

    webSocket.send(message);
  }

  sendToAllSessionClients(type: string, payload: unknown): void {
    console.log(`[Session] Sending "${type}" to all clients in session "${this.id}" ...`);

    for (const [, sessionClient] of this._state.clients) {
      this.sendToSessionClient(sessionClient.id, type, payload);
    }
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
