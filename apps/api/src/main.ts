import cors from 'cors';
import express, { Request } from 'express';
import expressWs from 'express-ws';
import { WebSocket } from 'ws';

import { sessionManager } from './SessionManager';
import { webSocketManager } from './WebSocketManager';

export async function bootstrap(port?: number) {
  if (!port) {
    port = parseInt(process.env.API_PORT as string) || 3000;
  }

  // Boot
  const ws = expressWs(express());

  const app = ws.app;
  app.use(express.json());
  app.use(cors());

  // Routes
  app.get('/', (_, res) => {
    res.json({ hello: 'world' });
  });

  app.ws('/ws', (ws: WebSocket, req: Request) => {
    webSocketManager.initWebSocketConnection(ws, req, sessionManager);
  });

  // Listen
  const url = `http://localhost:${port}`;

  return new Promise((resolve) => {
    app.listen(port, () => {
      console.log(`[API] 🚀 Running on: ${url}`);

      resolve(app);
    });
  });
}

bootstrap();
