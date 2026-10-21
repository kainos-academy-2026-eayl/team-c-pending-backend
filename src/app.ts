import express, { type Express, type Request, type Response } from 'express';
import 'dotenv/config';
import utilityRouter from './controllers/utility_controller';
import authRouter from './controllers/auth_controller';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  app.use('/login', authRouter);

  app.use('/', utilityRouter);

  return app;
}
