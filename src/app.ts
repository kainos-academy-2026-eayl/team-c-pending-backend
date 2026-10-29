/// <reference path="env.d.ts" />

import express, { type Express } from 'express';
import 'dotenv/config';
import basketController from './controllers/basket_controller';
import utilityRouter from './controllers/health_controller';
import loginRouter from './controllers/login_controller';
import { createProductRouter } from './controllers/product_controller';
import registrationRouter from './controllers/registration_controller';
import BasketRepository from './prisma_repo/basket_repository';
import { CustomerRepository } from './prisma_repo/customer_repository';
import { ProductRepository } from './prisma_repo/product_repository';
import prisma from './prismaClient';
import BasketService from './services/basket_service';
import { CustomerService } from './services/customer_service';
import { LoginService } from './services/login_service';
import { ProductService } from './services/product_service';

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

  app.locals.basketService = new BasketService(new BasketRepository(prisma));

  app.locals.customerService = customerService;
  app.locals.loginService = loginService;

  app.use('/', registrationRouter);
  app.use('/', loginRouter);
  app.use('/', utilityRouter);
  app.use(
    '/products',
    createProductRouter(
      productService,
    ),
  );
  app.use('/basket', basketController);

  return app;
}
