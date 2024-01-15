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

  private _sessionClientTokenToIdCacheMap: Map<string, string> = new Map();

  private _state: SessionInterface;

  private _terminatedCallback: () => void;

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

  onTerminated(callback: () => void) {
    this._terminatedCallback = callback;
  }

  terminate() {
    console.log(`[Session] Session "${this._state.id}" terminating ...`);

    // TODO: terminate all clients first

    this._terminatedCallback?.();
  }

  // Events
  onMessage(clientSessionToken: string, message: unknown) {
    const data = serializer.deserialize(message as string) as { type: string; payload: unknown };

    const { type, payload } = data;

    if (type === SessionTypeEnum.PONG) {
      this.onPongMessage(clientSessionToken);
    }
  }

  onError(clientSessionToken: string, error: Error) {
    this.removeClient(clientSessionToken);
  }

  onClose(clientSessionToken: string) {
    this.removeClient(clientSessionToken);
  }

  // Session Events
  onPongMessage(clientSessionToken: string) {
    const sessionClient = this.getClient(clientSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${clientSessionToken}" not found in session "${this.id}"`
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
  addClient(clientSessionToken: string, displayName?: string) {
    console.log(
      `[Session] Adding client with token "${clientSessionToken}" to session "${this.id}" ...`
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
      clientSessionToken,
      displayName,
      deviceType,
      devicePlatform,
      connectedAt: now,
      disconnectedAt: 0,
      ping: 0,
    };

    this._state.clients.set(sessionClient.id, sessionClient);
    this._sessionClientTokenToIdCacheMap.set(clientSessionToken, id);

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

  removeClient(clientSessionToken: string) {
    console.log(
      `[Session] Removing client with token "${clientSessionToken}" from session "${this.id}" ...`
    );

    const sessionClient = this.getClient(clientSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${clientSessionToken}" not found in session "${this.id}"`
      );

      return;
    }

    this._state.clients.delete(sessionClient.id);
    this._sessionClientTokenToIdCacheMap.delete(sessionClient.clientSessionToken);
  }

  getClient(clientSessionToken: string): SessionClientInterface | null {
    const sessionClientId = this._sessionClientTokenToIdCacheMap.get(clientSessionToken);
    if (!sessionClientId) {
      return null;
    }

    return this._state.clients.get(sessionClientId) ?? null;
  }

  // Messages
  sendToSessionClient(sessionClientId: string, type: string, payload?: unknown): void {
    const sessionClient = this._state.clients.get(sessionClientId);
    if (!sessionClient) {
      console.log(`[Session] Client with ID ${sessionClientId} not found in session ${this.id}`);

      return;
    }

    const webSocket = sessionManager.getClientBySessionToken(sessionClient.clientSessionToken);
    if (!webSocket) {
      console.log(
        `[Session] Client with token "${sessionClient.clientSessionToken}" not found in session "${this.id}"`
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

      this.sendToSessionClient(sessionClient.id, SessionTypeEnum.PING);
    }
  }
}
