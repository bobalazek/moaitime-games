import { SessionClientInterface } from './SessionClient';
import { SessionStateInterface } from './SessionState';

export enum SessionTypeEnum {
  CREATE_SESSION = 'create-session',
  JOIN_SESSION = 'join-session',
  SESSION_CREATED = 'session-created',
  SESSION_JOINED = 'session-joined',
}

export type SessionTypePayloadMap = {
  [SessionTypeEnum.CREATE_SESSION]: undefined;
  [SessionTypeEnum.JOIN_SESSION]: {
    accessCode: string;
  };
  [SessionTypeEnum.SESSION_CREATED]: {
    sessionClient: SessionClientInterface;
    sessionState: SessionStateInterface;
  };
  [SessionTypeEnum.SESSION_JOINED]: {
    sessionClient: SessionClientInterface;
    sessionState: SessionStateInterface;
  };
};
