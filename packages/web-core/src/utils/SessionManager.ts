import { SessionClientInterface, SessionStateInterface } from '@moaitime-games/shared-common';

export class SessionManager {
  private _sessionClient: SessionClientInterface | null = null;
  private _sessionState: SessionStateInterface | null = null;

  getSessionClient() {
    return this._sessionClient;
  }

  getSessionState() {
    return this._sessionState;
  }

  async joinSession(accessCode: string) {
    // TODO
  }

  async createSession() {
    // TODO
  }
}

export const sessionManager = new SessionManager();
