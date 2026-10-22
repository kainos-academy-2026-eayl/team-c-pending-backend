import express, { type Express } from 'express';
import 'dotenv/config';
import utilityRouter from './controllers/health_controller';
import authRouter from './controllers/login_controller';
import { createProductRouter } from './controllers/product_controller';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { ProductRepository } from './prisma_repo/product_repository';
import { AuthService } from './services/auth_service';
import { ProductService } from './services/product_service';

export function createApp(): Express {
  const app = express();

  app.use(express.json({ limit: '100kb' }));
  // initialize repositories and services
  const customerRepository = new CustomerRepository();
  const authService = new AuthService(
    customerRepository,
    process.env.JWT_SECRET ?? '',
  );
  const productRepository = new ProductRepository();
  const productService = new ProductService(productRepository);

  app.locals.authService = authService;
  // login router
  app.use('/', authRouter);
  app.use('/products', createProductRouter(new ProductService(new ProductRepository)))
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
