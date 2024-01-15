import { SessionClientInterface } from './SessionClient';

export interface SessionInterface<TGameState = unknown> {
  id: string;
  accessCode: string;
  clients: Map<string, SessionClientInterface>;
  createdAt: number;
  gameState?: TGameState;
  hostClientId?: string; // Who is the host of this session?
  controllerClientId?: string; // Who is the controller of this session?
}
