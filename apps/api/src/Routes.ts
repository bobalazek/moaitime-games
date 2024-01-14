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
    const token = webSocketManager.issueToken();

    res.json({ token });
  });

  app.post('/session', (_, res) => {
    const session = sessionManager.createSession();

    res.json(session.getState());
  });

  app.post('/session/:id', (req, res) => {
    const { id } = req.params;
    const { byAccessCode, token } = req.query;
    if (!id) {
      res.status(400).json({ error: 'Missing id or access code' });
      return;
    }

    const session =
      byAccessCode === 'true'
        ? sessionManager.getSessionByAccessCode(id)
        : sessionManager.getSession(id);
    if (!session) {
      res.status(404).json({ error: 'Session not found' });
      return;
    }

    const { body } = req as Request & { body: Record<string, unknown> };

    if (body && Object.keys(body).length > 0) {
      webSocketManager.updateIssuedToken(token as string, body);
    }

    res.json(session.getState());
  });

  app.ws('/ws/session/:id', (webSocket: WebSocket, req) => {
    const { token } = req.query;
    const { id } = req.params;

    if (!token) {
      webSocket.close(4001, 'Missing token');
      return;
    }

    if (!id) {
      webSocket.close(4002, 'Missing id');
      return;
    }

    webSocketManager.onConnection(webSocket, token as string, id);
  });
};
