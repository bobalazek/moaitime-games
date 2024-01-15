import { SessionClientInterface } from './SessionClient';

export interface SessionInterface<TGameState = unknown> {
  id: string;
  accessCode: string;
  clients: Map<string, SessionClientInterface>;
  createdAt: number;
  gameState?: TGameState;
  hostClientId?: string;
  controllerClientId?: string;
}
