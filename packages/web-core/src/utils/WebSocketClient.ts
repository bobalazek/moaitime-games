import { WS_URL } from '@moaitime-games/shared-common';

export interface WebSocketClientOptions {
  maxRetries: number;
  retryInterval: number;
  heartbeatInterval: number;
}

export class WebSocketClient {
  private _options: WebSocketClientOptions;
  private _client: WebSocket | null = null;
  private _isReconnecting: boolean = false;
  private _heartbeatInterval: NodeJS.Timeout | null = null;
  private _listeners: ((data: unknown) => void)[] = [];

  constructor(options: Partial<WebSocketClientOptions> = {}) {
    this._options = {
      maxRetries: options.maxRetries ?? 5,
      retryInterval: options.retryInterval ?? 100,
      heartbeatInterval: options.heartbeatInterval ?? 5000,
    };
  }

  public async getClient(): Promise<WebSocket> {
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

  public async send<T>(type: string, payload?: T) {
    const client = await this.getClient();
    client.send(JSON.stringify({ type, payload }));
  }

  public on(listener: (data: unknown) => void): void {
    this._listeners.push(listener);
  }

  public off(listener: (data: unknown) => void): void {
    this._listeners = this._listeners.filter((l) => l !== listener);
  }

  public onType<T>(type: string, listener: (payload: T) => void): void {
    this.on((message) => {
      const { type: messageType, payload } = JSON.parse(message as string);

      if (messageType === type) {
        listener(payload);
      }
    });
  }

  public offType<T>(type: string, listener: (payload: T) => void): void {
    this.off((message) => {
      const { type: messageType, payload } = JSON.parse(message as string);

      if (messageType === type) {
        listener(payload);
      }
    });
  }

  private async _createWebSocket(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const websocket = new WebSocket(WS_URL);
      let retries = 0;

      websocket.onopen = () => {
        this._client = websocket;
        this._isReconnecting = false;
        this._startHeartbeat();
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
        this._stopHeartbeat();
        if (!this._isReconnecting) {
          this._isReconnecting = true;
          this.getClient(); // Attempt to reconnect
        }
      };

      websocket.onmessage = (messageEvent) => {
        this._notifyListeners(messageEvent);
      };
    });
  }

  private _notifyListeners(messageEvent: MessageEvent): void {
    for (const listener of this._listeners) {
      listener(messageEvent.data);
    }
  }

  private _startHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
    }

    this._heartbeatInterval = setInterval(() => {
      this.send('ping');
    }, this._options.heartbeatInterval);
  }

  private _stopHeartbeat() {
    if (this._heartbeatInterval) {
      clearInterval(this._heartbeatInterval);
      this._heartbeatInterval = null;
    }
  }
}

export const webSocketClient = new WebSocketClient();
