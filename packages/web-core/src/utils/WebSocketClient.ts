import { serializer, SessionTypeEnum, WS_URL } from '@moaitime-games/shared-common';

import { useSessionStore } from '../state/sessionStore';

export interface WebSocketClientOptions {
  maxRetries: number;
  retryInterval: number;
}

export class WebSocketClient {
  private _options: WebSocketClientOptions;

  private _client: WebSocket | null = null;
  private _isReconnecting: boolean = false;

  private _listeners: ((data: unknown) => void)[] = [];

  constructor(options: Partial<WebSocketClientOptions> = {}) {
    this._options = {
      maxRetries: options.maxRetries ?? 5,
      retryInterval: options.retryInterval ?? 200,
    };
  }

  async connect() {
    await this.getClient();
  }

  async getClient(): Promise<WebSocket> {
    if (this._client && this._client.readyState === WebSocket.OPEN) {
      return this._client;
    }

    if (this._isReconnecting) {
      return new Promise((resolve, reject) => {
        setTimeout(() => this.getClient().then(resolve).catch(reject), this._options.retryInterval);
      });
    }

    this._isReconnecting = true;
    return this._createWebSocket();
  }

  async send<T>(type: string, payload?: T) {
    const client = await this.getClient();

    const clientTime = Date.now();

    client.send(serializer.serialize({ type, payload, clientTime }));
  }

  on<T>(listener: (data: T) => void): void {
    this._listeners.push(listener as (data: unknown) => void);
  }

  off(listener: (data: unknown) => void): void {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  private async _createWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const { sessionToken, sessionId } = useSessionStore.getState();

      const websocketUrl = `${WS_URL}/session/${sessionId}?sessionToken=${sessionToken}`;
      const websocket = new WebSocket(websocketUrl);

      let retries = 0;

      websocket.onopen = (event) => {
        console.log(event);
        this._client = websocket;
        this._isReconnecting = false;

        resolve(websocket);
      };

      websocket.onerror = (event) => {
        console.log(event);
        if (retries < this._options.maxRetries) {
          setTimeout(
            () => {
              retries++;
              this._createWebSocket().then(resolve).catch(reject);
            },
            Math.pow(2, retries) * this._options.retryInterval
          );
        } else {
          reject(new Error('Max retries reached'));
        }
      };

      websocket.onclose = (event) => {
        console.log(event);
        if (!this._isReconnecting) {
          this._isReconnecting = true;
          this.getClient(); // Attempt to reconnect
        }
      };

      websocket.onmessage = (messageEvent) => {
        const data = serializer.deserialize(messageEvent.data as string);

        if (data && (data as { type: string }).type === SessionTypeEnum.PING) {
          this.send(SessionTypeEnum.PONG);

          return;
        }

        for (const listener of this._listeners) {
          listener(data);
        }
      };
    });
  }
}

export const webSocketClient = new WebSocketClient();
