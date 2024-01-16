import { PatcherOperation } from '../core/Patcher';
import { SessionInterface } from './Session';

export enum SessionTypeEnum {
  // Server -> Client
  SERVER_TO_CLIENT_PING = 0,
  SERVER_TO_CLIENT_PONG = 1,
  SERVER_TO_CLIENT_DELTA_STATE_UPDATE = 2,
  SERVER_TO_CLIENT_FULL_STATE_UPDATE = 3,
  SERVER_TO_CLIENT_REQUEST_CURRENT_TIME = 4,
  // Client -> Server
  CLIENT_TO_SERVER_PING = 16,
  CLIENT_TO_SERVER_PONG = 17,
  CLIENT_TO_SERVER_LEAVE = 18,
  CLIENT_TO_SERVER_CONTROLLER_COMMAND = 19,
  CLIENT_TO_SERVER_CURRENT_TIME = 20,
}

export type SessionTypePayloadMap = {
  // Server -> Client
  [SessionTypeEnum.SERVER_TO_CLIENT_PING]: { id: string };
  [SessionTypeEnum.SERVER_TO_CLIENT_PONG]: { id: string };
  [SessionTypeEnum.SERVER_TO_CLIENT_DELTA_STATE_UPDATE]: PatcherOperation[];
  [SessionTypeEnum.SERVER_TO_CLIENT_FULL_STATE_UPDATE]: SessionInterface;
  // Client -> Server
  [SessionTypeEnum.CLIENT_TO_SERVER_PING]: { id: string };
  [SessionTypeEnum.CLIENT_TO_SERVER_PONG]: { id: string };
  [SessionTypeEnum.CLIENT_TO_SERVER_LEAVE]: undefined;
  [SessionTypeEnum.CLIENT_TO_SERVER_CONTROLLER_COMMAND]: SessionControllerCommandEnum;
  [SessionTypeEnum.CLIENT_TO_SERVER_CURRENT_TIME]: { currentTime: number };
};

export enum SessionControllerCommandEnum {
  CONFIRM = 0,
  LEFT = 1,
  RIGHT = 2,
  UP = 3,
  DOWN = 4,
}

export type SessionWebSocketMessage = [SessionTypeEnum, unknown?];
