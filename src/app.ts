import express, { type Express, type Request, type Response } from 'express';
import { CustomerController } from './controllers/customer_controller';
import { CustomerService } from './services/customer_service';
import { CustomerRepository } from './prisma_repo/customer_repository';

export function createApp(): Express {
  const app = express();

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'UP', time: new Date().toISOString() });
  });

  app.post('/customers', (req: Request, res: Response) => {
    new CustomerController(new CustomerService(new CustomerRepository())).create(req, res);
  });
  return app;
}

