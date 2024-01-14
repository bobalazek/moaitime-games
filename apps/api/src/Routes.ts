import { Request } from 'express';
import { Instance } from 'express-ws';
import { WebSocket } from 'ws';

import { sessionManager } from './SessionManager';
import { webSocketManager } from './WebSocketManager';

export const addRoutes = (app: Instance['app']) => {
  app.get('/', (_, res) => {
    res.json({ hello: 'world' });
  });

  app.post('/session', (_, res) => {
    try {
      const token = webSocketManager.issueToken();
      const session = sessionManager.createSession();
      const sessionState = session.getState();

      res.json({
        token,
        sessionId: sessionState.id,
        sessionAccessCode: sessionState.accessCode,
      });
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
    }
  });

  app.post('/session/:id', (req, res) => {
    try {
      const { id } = req.params;
      const { byAccessCode, token } = req.query;
      const { body } = req as Request & { body: Record<string, unknown> };

      if (!id) {
        throw new Error('Missing ID or Access Code');
      }

      const session =
        byAccessCode === 'true'
          ? sessionManager.getSessionByAccessCode(id)
          : sessionManager.getSession(id);
      if (!session) {
        throw new Error('Session not found');
      }

      const sessionState = session.getState();

      let issuedToken = token as string | undefined;
      if (!issuedToken) {
        issuedToken = webSocketManager.issueToken();
      }

      if (body && Object.keys(body).length > 0) {
        if (body.displayName !== undefined) {
          if (body.displayName.length < 3) {
            throw new Error('Display name must be at least 3 characters');
          } else if (body.displayName.length > 16) {
            throw new Error('Display name must be less than 16 characters');
          }
        }

        webSocketManager.updateIssuedToken(issuedToken, body);
      }

      res.json({
        token: issuedToken,
        sessionId: sessionState.id,
        sessionAccessCode: sessionState.accessCode,
      });
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
    }
  });

  app.ws('/ws/session/:id', (webSocket: WebSocket, req) => {
    const { token } = req.query;
    const { id } = req.params;

    if (!token) {
      webSocket.close(4001, 'Missing token');
      return;
    }

    if (!id) {
      webSocket.close(4002, 'Missing session ID');
      return;
    }

    webSocketManager.onConnection(webSocket, token as string, id);
  });
};
