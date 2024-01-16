import { PatcherOperation } from '../core/Patcher';
import { SessionInterface } from './Session';

export enum SessionTypeEnum {
  PING = 0,
  PONG = 1,
  LEAVE = 2,
  DELTA_STATE_UPDATE = 3,
  FULL_STATE_UPDATE = 4,
  CONTROLLER_COMMAND = 5,
}

export type SessionTypePayloadMap = {
  [SessionTypeEnum.PING]: { id: string };
  [SessionTypeEnum.PONG]: { id: string };
  [SessionTypeEnum.LEAVE]: undefined;
  [SessionTypeEnum.DELTA_STATE_UPDATE]: PatcherOperation[];
  [SessionTypeEnum.FULL_STATE_UPDATE]: SessionInterface;
  [SessionTypeEnum.CONTROLLER_COMMAND]: SessionControllerCommandEnum;
};

export enum SessionControllerCommandEnum {
  CONFIRM = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
  DOWN = 4,
}

export type SessionWebSocketMessage = [SessionTypeEnum, unknown?];
