import { Request } from 'express';
import { Instance } from 'express-ws';
import { WebSocket } from 'ws';

import { sessionManager } from '../session/SessionManager';

export const addSessionRoutes = (app: Instance['app']) => {
  // HTTP
  app.post('/session', (_, res) => {
    try {
      const sessionToken = sessionManager.issueSessionToken();
      const session = sessionManager.createSession();
      const sessionState = session.getState();

      res.json({
        sessionToken,
        sessionId: sessionState.id,
        sessionAccessCode: sessionState.accessCode,
      });
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
    }
  });

  app.post('/session/:sessionId', (req, res) => {
    try {
      const { sessionId } = req.params;
      const { byAccessCode, sessionToken } = req.query;
      const { body } = req as Request & { body: Record<string, unknown> };

      if (!sessionId) {
        throw new Error('Missing Session ID or Access Code');
      }

      const session =
        byAccessCode === 'true'
          ? sessionManager.getSessionByAccessCode(sessionId)
          : sessionManager.getSession(sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const sessionState = session.getState();

      let issuedSessionToken = sessionToken as string | undefined;
      if (!issuedSessionToken) {
        issuedSessionToken = sessionManager.issueSessionToken();
      }

      if (body && Object.keys(body).length > 0) {
        if (body.displayName !== undefined) {
          if (body.displayName.length < 3) {
            throw new Error('Display name must be at least 3 characters');
          } else if (body.displayName.length > 16) {
            throw new Error('Display name must be less than 16 characters');
          }
        }

        sessionManager.updateSessionToken(issuedSessionToken, body);
      }

      res.json({
        sessionToken: issuedSessionToken,
        sessionId: sessionState.id,
        sessionAccessCode: sessionState.accessCode,
      });
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
    }
  });

  // WebSocket
  app.ws('/ws/session/:sessionId', (webSocket: WebSocket, req) => {
    const { sessionId } = req.params;
    const { sessionToken } = req.query;

    if (!sessionId) {
      console.log('[Routes] No session ID provided');

      webSocket.terminate();

      return;
    }

    if (!sessionToken) {
      console.log('[Routes] No session token provided');

      webSocket.terminate();

      return;
    }

    sessionManager.onConnection(webSocket, sessionToken as string, sessionId);
  });
};
