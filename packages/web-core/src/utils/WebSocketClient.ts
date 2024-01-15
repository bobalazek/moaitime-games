import { serializer, SessionTypeEnum } from '@moaitime-games/shared-common';

export interface WebSocketClientOptions {
  maxRetries: number;
  retryInterval: number;
}

export class WebSocketClient {
  private _url: string;
  private _options: WebSocketClientOptions;

  private _client: WebSocket | null = null;
  private _isReconnecting: boolean = false;

  private _listeners: ((data: unknown) => void)[] = [];

  constructor(url: string, options: Partial<WebSocketClientOptions> = {}) {
    this._url = url;
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

    client.send(serializer.serialize({ type, payload }));
  }

  on<T>(listener: (data: T) => void): void {
    this._listeners.push(listener as (data: unknown) => void);
  }

  off(listener: (data: unknown) => void): void {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  private async _createWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(this._url);

      let retries = 0;

      websocket.onopen = () => {
        this._client = websocket;
        this._isReconnecting = false;

        resolve(websocket);
      };

      websocket.onerror = () => {
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

      websocket.onclose = () => {
        if (!this._isReconnecting) {
          this._isReconnecting = true;
          this.connect();
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
