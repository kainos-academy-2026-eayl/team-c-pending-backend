import express, { type Express, type Request, type Response } from 'express';
import { CustomerController } from './controllers/customer_controller';
import { CustomerService } from './services/customer_service';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { AuthService } from './services/auth_service';
import { AuthController } from './controllers/auth_controller';


export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: "100kb" }));

  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret || jwtSecret.trim().length === 0) {
    throw new Error("JWT_SECRET environment variable is not set");
  }

  const authController = new AuthController(
    new AuthService(new CustomerRepository(), jwtSecret),
  );

  app.post("/auth/login", (req, res) =>
    authController.login(req, res),
  );

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'UP', time: new Date().toISOString() });
  });

  app.post('/customers', (req: Request, res: Response) => {
    new CustomerController(new CustomerService(new CustomerRepository())).create(req, res);
  });
  return app;
}

