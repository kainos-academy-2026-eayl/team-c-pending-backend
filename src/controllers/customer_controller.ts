import { type Request, type Response, Router } from 'express';
import type { Customer } from '../generated/prisma/browser';
import prisma from '../prismaClient';
import type { CustomerService } from '../services/customer_service';

// this basically creates a controller for customer projects and what a customer as a class should look like
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAll(res: Response): Promise<void> {
    const customers = await this.customerService.findAll();
    res.json(
      customers.map(({ customerID, firstName, lastName, email }) => ({
        customerID,
        firstName,
        lastName,
        email,
      })),
    );
  }

  async create(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, email, password } = req.body;
    const _customer = await this.customerService.create({
      firstName,
      lastName,
      email,
      password,
    });
    res.json('All okay');
  }
  findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({
      where: { email },
    });
  }
}

export function createCustomerRouter(customerService: CustomerService): Router {
  const router = Router();
  const controller = new CustomerController(customerService);

  router.get('/', (_req, res) => controller.getAll(res));
  router.post('/', (req, res) => controller.create(req, res));

  return router;
}
