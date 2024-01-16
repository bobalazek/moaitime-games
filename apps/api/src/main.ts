import cors from 'cors';
import express from 'express';
import expressWs from 'express-ws';

import { addRoutes } from './routes';

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
  addRoutes(app);

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
