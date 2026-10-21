import express, { type Express } from 'express';
import 'dotenv/config';
import utilityRouter from './controllers/health_controller';
import authRouter from './controllers/login_controller';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { AuthService } from './services/auth_service';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  // initialize repositories and services
  const customerRepository = new CustomerRepository();
  const authService = new AuthService(
    customerRepository,
    process.env.JWT_SECRET ?? '',
  );

  app.locals.authService = authService;
  // login router
  app.use('/', authRouter);
  //health check router
  app.use('/', utilityRouter);

  return app;
}
