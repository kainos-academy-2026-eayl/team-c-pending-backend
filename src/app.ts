import express, { type Express, type Request, type Response } from 'express';
import CustomerController from './controllers/CustomerController';
import CustomerRepository from './repositories/CustomerRepository';
import CustomerService from './services/CustomerService';

export function createApp(): Express {
  const app = express();

  app.use(express.json());

  app.use(express.static("public"));

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'UP', time: new Date().toISOString() });
  });

  app.post('/customers', (req: Request, res: Response) => {
    new CustomerController(
      new CustomerService(new CustomerRepository()),
    ).create(req, res);
  });
  return app;
}
