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

  app.get('/session/:id', (req, res) => {
    const { id } = req.params;
    const { byAccessCode } = req.query;
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

    res.json(session.getState());
  });

  app.ws('/ws/session/:id', (webSocket: WebSocket, req) => {
    const { id } = req.params;
    const { token } = req.query;

    webSocketManager.onConnection(webSocket, token as string, id);
  });
};
