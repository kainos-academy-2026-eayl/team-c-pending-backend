import express, { type Express } from 'express';
import 'dotenv/config';
import authRouter from './controllers/auth_controller';
import utilityRouter from './controllers/utility_controller';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { AuthService } from './services/auth_service';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));

  const customerRepository = new CustomerRepository();
  const authService = new AuthService(
    customerRepository,
    process.env.JWT_SECRET ?? '',
  );
  app.locals.authService = authService;

  app.use('/', authRouter);

  app.use('/', utilityRouter);

  return app;
}
