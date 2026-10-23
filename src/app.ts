import express, { type Express } from 'express';
import 'dotenv/config';
import utilityRouter from './controllers/health_controller';
import loginRouter from './controllers/login_controller';
import registrationRouter from './controllers/registration_controller';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { CustomerService } from './services/customer_service';
import { LoginService } from './services/login_service';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  // initialize repositories and services
  const customerRepository = new CustomerRepository();
  const customerService = new CustomerService(customerRepository);
  const loginService = new LoginService(
    customerRepository,
    process.env.JWT_SECRET ?? '',
  );
  const productRepository = new ProductRepository();
  const productService = new ProductService(productRepository);

  app.locals.authService = authService;
  // login router
  app.use('/', authRouter);
  app.use(
    '/products',
    createProductRouter(new ProductService(new ProductRepository())),
  );
  //health check router
  app.use('/', utilityRouter);
  app.use(
    '/products',
    createProductRouter(
      productService as unknown as Parameters<typeof createProductRouter>[0],
    ),
  );

  return app;
}
