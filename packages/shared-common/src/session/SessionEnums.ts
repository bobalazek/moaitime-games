import { SessionInterface } from './Session';
import { SessionClientInterface } from './SessionClient';

export enum SessionTypeEnum {
  // Requests
  CREATE_SESSION = 'create-session',
  JOIN_SESSION = 'join-session',
  // Responses
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
    session: SessionInterface;
  };
  [SessionTypeEnum.SESSION_JOINED]: {
    sessionClient: SessionClientInterface;
    session: SessionInterface;
  };
};
