import { SessionClientInterface } from './SessionClient';

export interface SessionInterface<TGameState = unknown> {
  id: string;
  accessCode: string;
  clients: SessionClientInterface[];
  createdAt: number;
  gameState?: TGameState;
  hostClientId?: string;
  controllerClientId?: string;
  _accessPassword?: string;
}
