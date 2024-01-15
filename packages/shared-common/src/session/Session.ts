import { SessionClientInterface } from './SessionClient';

// DO NOT USE MAPS UNTIL WE FIGURE OUT HOW TO EFFICIENTLY SERIALIZE THEM

export interface SessionInterface<TGameState = unknown> {
  id: string;
  accessCode: string;
  clients: Record<string, SessionClientInterface>;
  createdAt: number;
  gameState?: TGameState;
  hostClientId?: string; // Who is the host of this session?
  controllerClientId?: string; // Who is the controller of this session?
}
