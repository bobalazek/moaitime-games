import { Request } from 'express';
import { Instance } from 'express-ws';
import { WebSocket } from 'ws';

import { sessionManager } from './SessionManager';
import { webSocketManager } from './WebSocketManager';

export const addRoutes = (app: Instance['app']) => {
  app.get('/', (_, res) => {
    res.json({ hello: 'world' });
  });

  app.get('/token', (_, res) => {
    try {
      const token = webSocketManager.issueToken();

      res.json({ token });
    } catch (error: unknown) {
      res
        .status(400)
        .json({ error: error instanceof Error ? error.message : 'Something went wrong' });
    }
  });

  app.post('/session', (_, res) => {
    try {
      const session = sessionManager.createSession();

      res.json(session.getState());
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
      if (!id) {
        throw new Error('Missing id or access code');
      }

      const session =
        byAccessCode === 'true'
          ? sessionManager.getSessionByAccessCode(id)
          : sessionManager.getSession(id);
      if (!session) {
        throw new Error('Session not found');
        return;
      }

      const { body } = req as Request & { body: Record<string, unknown> };

      if (body && Object.keys(body).length > 0) {
        webSocketManager.updateIssuedToken(token as string, body);
      }

      res.json(session.getState());
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
