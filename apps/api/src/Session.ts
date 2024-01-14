import {
  DevicePlatformEnum,
  DeviceTypeEnum,
  SessionClientInterface,
  SessionInterface,
} from '@moaitime-games/shared-common';

import { generateRandomHash } from './Helpers';

export class Session {
  private _state: SessionInterface;

  constructor(id: string, accessCode: string) {
    this._state = {
      id,
      accessCode,
      createdAt: Date.now(),
      clients: [],
    };
  }

  createClient(webSocketToken: string) {
    const id = generateRandomHash(8);
    const now = Date.now();

    const sessionClient: SessionClientInterface = {
      id,
      webSocketToken,
      displayName: 'Host',
      deviceType: DeviceTypeEnum.UNKNOWN,
      devicePlatform: DevicePlatformEnum.UNKNOWN,
      connectedAt: now,
      disconnectedAt: 0,
      lastPingAt: now,
    };

    return sessionClient;
  }

  addClient(sessionClient: SessionClientInterface) {
    this._state.clients.push(sessionClient);
  }

  getState() {
    return this._state;
  }

  setState(session: SessionInterface) {
    this._state = session;
  }
}
