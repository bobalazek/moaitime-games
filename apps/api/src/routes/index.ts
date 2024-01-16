import { Instance } from 'express-ws';

import { addSessionRoutes } from './SessionRoutes';

export const addRoutes = (app: Instance['app']) => {
  app.get('/', (_, res) => {
    res.json({ hello: 'world' });
  });

  addSessionRoutes(app);
};
