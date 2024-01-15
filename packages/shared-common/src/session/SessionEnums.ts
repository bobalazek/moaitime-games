import { SessionInterface } from './Session';

export enum SessionTypeEnum {
  PING = 'ping',
  PONG = 'pong',
  DELTA_STATE_UPDATE = 'delta-state-update',
  FULL_STATE_UPDATE = 'full-state-update',
}

export type SessionTypePayloadMap = {
  [SessionTypeEnum.FULL_STATE_UPDATE]: SessionInterface;
};
