import rfdc from 'rfdc';

import {
  DevicePlatformEnum,
  DeviceTypeEnum,
  patcher,
  serializer,
  SessionClientInterface,
  SessionInterface,
  SessionTypeEnum,
  SessionWebSocketCloseCodeEnum,
  SessionWebSocketMessage,
} from '@moaitime-games/shared-common';

import { generateRandomHash } from '../Helpers';
import { sessionManager } from './SessionManager';

const PING_INTERVAL = 2000;
const DISCONNECT_INTERVAL = 1000;
const STATE_UPDATE_FPS = 30;

const clone = rfdc();

export class Session {
  private _state: SessionInterface;

  private _lastPingTimes: Map<string, number> = new Map();
  private _lastPongTimes: Map<string, number> = new Map();

  private _sessionClientRequiringFullStateUpdateSet: Set<string> = new Set();
  private _sessionClientTokenToIdCacheMap: Map<string, string> = new Map();
  private _sessionClientTimeOffsetMap: Map<string, number> = new Map();

  private _stateUpdateInterval: NodeJS.Timeout;
  private _pingInterval: NodeJS.Timeout;
  private _disconnectDetectionInterval: NodeJS.Timeout;

  private _onTerminatedCallback: () => void;

  constructor(id: string, accessCode: string) {
    this._state = {
      id,
      accessCode,
      createdAt: Date.now(),
      clients: {},
    };

    this.init();
  }

  init() {
    console.log(`[Session] Session "${this._state.id}" initializing ...`);

    // State update loop
    let lastState: SessionInterface | null = null;
    this._stateUpdateInterval = setInterval(() => {
      const currentState = this._state;

      if (!lastState) {
        lastState = this.deepClone(currentState);

        for (const sessionClient of Object.values(this._state.clients)) {
          this.sendToSessionClient(
            sessionClient.id,
            SessionTypeEnum.SERVER_TO_CLIENT_FULL_STATE_UPDATE,
            currentState
          );

          this._sessionClientRequiringFullStateUpdateSet.delete(sessionClient.id);
        }
      } else {
        const delta = patcher.compare(lastState, currentState);
        if (delta.length > 0) {
          lastState = this.deepClone(currentState);

          for (const sessionClient of Object.values(this._state.clients)) {
            if (this._sessionClientRequiringFullStateUpdateSet.has(sessionClient.id)) {
              continue;
            }

            this.sendToSessionClient(
              sessionClient.id,
              SessionTypeEnum.SERVER_TO_CLIENT_DELTA_STATE_UPDATE,
              delta
            );
          }
        } else {
          // If a new client has joined, that one will need a full update first
          if (this._sessionClientRequiringFullStateUpdateSet.size === 0) {
            return;
          }

          for (const sessionClient of Object.values(this._state.clients)) {
            if (!this._sessionClientRequiringFullStateUpdateSet.has(sessionClient.id)) {
              continue;
            }

            this.sendToSessionClient(
              sessionClient.id,
              SessionTypeEnum.SERVER_TO_CLIENT_FULL_STATE_UPDATE,
              currentState
            );

            this._sessionClientRequiringFullStateUpdateSet.delete(sessionClient.id);
          }
        }
      }
    }, 1000 / STATE_UPDATE_FPS);

    // Starting the ping loop
    this._pingInterval = setInterval(() => {
      this._sendPingToAllClients();
    }, PING_INTERVAL);

    // Disconnect detection
    this._disconnectDetectionInterval = setInterval(() => {
      const now = Date.now();

      for (const sessionClient of Object.values(this._state.clients)) {
        const lastPongAt = this._lastPongTimes.get(sessionClient.id);
        if (!lastPongAt) {
          continue;
        }

        const disconnectedAt = now - lastPongAt;
        if (disconnectedAt < PING_INTERVAL * 2) {
          continue;
        }

        sessionClient.disconnectedAt = now;
      }
    }, DISCONNECT_INTERVAL);
  }

  get id() {
    return this._state.id;
  }

  get accessCode() {
    return this._state.accessCode;
  }

  // Events
  onMessage(clientSessionToken: string, message: unknown) {
    const data = serializer.deserialize(message as string) as SessionWebSocketMessage;

    const [type, payload] = data;

    console.log(`[Session] Received "${type}" from client "${clientSessionToken}" ...`);

    if (type === SessionTypeEnum.CLIENT_TO_SERVER_PONG) {
      this.onPongMessage(clientSessionToken);
    } else if (type === SessionTypeEnum.CLIENT_TO_SERVER_LEAVE) {
      this.onLeaveMessage(clientSessionToken);
    } else if (type === SessionTypeEnum.CLIENT_TO_SERVER_CURRENT_TIME) {
      this.onCurrentTimeMessage(
        clientSessionToken,
        (payload as { currentTime: number })?.currentTime
      );
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

    sessionClient.disconnectedAt = 0;
    sessionClient.ping = ping > PING_INTERVAL ? PING_INTERVAL : ping;
  }

  onLeaveMessage(clientSessionToken: string) {
    const sessionClient = this.getClient(clientSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${clientSessionToken}" not found in session "${this.id}"`
      );

      return;
    }

    this.removeClient(clientSessionToken);
  }

  onCurrentTimeMessage(clientSessionToken: string, currentTime: number) {
    const sessionClient = this.getClient(clientSessionToken);
    if (!sessionClient) {
      console.log(
        `[Session] Client with token "${clientSessionToken}" not found in session "${this.id}"`
      );

      return;
    }

    const now = Date.now();
    const timeOffset = now - currentTime;

    this._sessionClientTimeOffsetMap.set(sessionClient.id, timeOffset);

    console.log(`[Session] Client "${sessionClient.id}" time offset: ${timeOffset}`);
  }

  // Termination
  terminate(
    code: SessionWebSocketCloseCodeEnum = SessionWebSocketCloseCodeEnum.TERMINATED,
    reason: string = 'Session terminated'
  ) {
    console.log(`[Session] Session "${this._state.id}" terminating ...`);

    const clients = Object.values(this._state.clients);
    for (const client of clients) {
      sessionManager.closeClientConnection(client.id, code, reason);
    }

    clearInterval(this._stateUpdateInterval);
    clearInterval(this._pingInterval);
    clearInterval(this._disconnectDetectionInterval);

    this._onTerminatedCallback?.();
  }

  // Registered callback in SessionManager so it knows when to remove the session from the map
  onTerminated(callback: () => void) {
    this._onTerminatedCallback = callback;
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

    const clientsCount = Object.keys(this._state.clients).length;

    if (!displayName) {
      displayName = `Player ${clientsCount + 1}`;
    }

    const isHost = clientsCount === 0;
    const isFirstPlayerBesidesHost = clientsCount === 1;

    if (isHost) {
      displayName = 'Host';
    }

    if (!displayName) {
      throw new Error('Display name not provided');
    }

    const id = generateRandomHash(6);
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

    this._state.clients[sessionClient.id] = sessionClient;
    this._sessionClientTokenToIdCacheMap.set(clientSessionToken, id);
    this._sessionClientRequiringFullStateUpdateSet.add(sessionClient.id);

    if (isHost) {
      this.updateState({
        hostClientId: sessionClient.id,
      });
    } else if (isFirstPlayerBesidesHost) {
      this.updateState({
        controllerClientId: sessionClient.id,
      });
    }

    // We want to know immediately what the ping is, as in the worst case it takes 2 seconds
    this._sendPingToClient(sessionClient.id);

    // We also want to know what the time offset is
    this.sendToSessionClient(
      sessionClient.id,
      SessionTypeEnum.SERVER_TO_CLIENT_REQUEST_CURRENT_TIME
    );

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

    delete this._state.clients[sessionClient.id];
    this._sessionClientTokenToIdCacheMap.delete(sessionClient.clientSessionToken);

    const clientWasHost = this._state.hostClientId === sessionClient.id;
    const clientWasController = this._state.controllerClientId === sessionClient.id;

    if (clientWasHost) {
      this.terminate(
        SessionWebSocketCloseCodeEnum.HOST_CLIENT_DISCONNECTED,
        'Session host client disconnected'
      );
    }

    if (clientWasController) {
      const nextAvailableClientExceptHost = Object.values(this._state.clients).find(
        (client) => client.id !== this._state.hostClientId
      );

      this.updateState({
        controllerClientId: nextAvailableClientExceptHost?.id ?? undefined,
      });
    }
  }

  getClient(clientSessionToken: string): SessionClientInterface | null {
    const sessionClientId = this._sessionClientTokenToIdCacheMap.get(clientSessionToken);
    if (!sessionClientId) {
      return null;
    }

    return this._state.clients[sessionClientId] ?? null;
  }

  // Messages
  sendToSessionClient(sessionClientId: string, type: SessionTypeEnum, payload?: unknown): void {
    const sessionClient = this._state.clients[sessionClientId];
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

    webSocket.send(serializer.serialize(payload ? [type, payload] : [type]));
  }

  // Private
  private _sendPingToAllClients() {
    for (const sessionClient of Object.values(this._state.clients)) {
      this._sendPingToClient(sessionClient.id);
    }
  }

  private _sendPingToClient(
    sessionClientId: string,
    now: number = Date.now(),
    id: string = generateRandomHash(4)
  ) {
    const sessionClient = this._state.clients[sessionClientId];

    this._lastPingTimes.set(sessionClient.id, now);

    this.sendToSessionClient(sessionClient.id, SessionTypeEnum.SERVER_TO_CLIENT_PING, {
      id,
    });
  }

  private deepClone<T>(value: T): T {
    return clone(value);
  }
}
