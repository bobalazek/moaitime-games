import { DevicePlatformEnum } from '../core/DevicePlatformEnum';
import { DeviceTypeEnum } from '../core/DeviceTypeEnum';

export interface SessionClientInterface {
  id: string;
  webSocketSessionToken: string;
  displayName: string;
  deviceType: DeviceTypeEnum;
  devicePlatform: DevicePlatformEnum;
  connectedAt: number;
  disconnectedAt: number;
  ping: number;
}
