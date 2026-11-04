import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { Customer } from '../generated/prisma/browser';
import { Prisma } from '../generated/prisma/client';
import { requireAdmin } from '../middleware/require_admin';
import prisma from '../prismaClient';
import type { CustomerService } from '../services/customer_service';

const customerIDParamsSchema = z.object({
  customerID: z.coerce.number().int().positive(),
});

const updateCustomerSchema = z
  .object({
    firstName: z.string().trim().min(1).optional(),
    lastName: z.string().trim().min(1).optional(),
    email: z.email().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one customer field must be provided',
  });

function customerDetails({
  customerID,
  firstName,
  lastName,
  email,
  role,
}: Customer) {
  return { customerID, firstName, lastName, email, role };
}

// this basically creates a controller for customer projects and what a customer as a class should look like
export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAll(res: Response): Promise<void> {
    const customers = await this.customerService.findAll();
    res.json(customers.map(customerDetails));
  }

  async delete(req: Request, res: Response): Promise<void> {
    const result = customerIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({ error: 'Invalid customer id' });
      return;
    }

    try {
      await this.customerService.delete(result.data.customerID);
      res.sendStatus(204);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') {
          res.status(404).json({ error: 'Customer not found' });
          return;
        }
        if (error.code === 'P2003') {
          res.status(409).json({
            error: 'Customer data changed during deletion. Please try again.',
          });
          return;
        }
      }
      throw error;
    }
  }

  async create(req: Request, res: Response): Promise<void> {
    const { firstName, lastName, email, password } = req.body;
    await this.customerService.create({ firstName, lastName, email, password });
    res.json('All okay');
  }

  async update(req: Request, res: Response): Promise<void> {
    const idResult = customerIDParamsSchema.safeParse(req.params);
    if (!idResult.success) {
      res.status(400).json({
        error: 'Invalid customer id',
        issues: idResult.error.issues,
      });
      return;
    }

    const dataResult = updateCustomerSchema.safeParse(req.body);
    if (!dataResult.success) {
      res.status(400).json({
        error: 'Invalid customer request',
        issues: dataResult.error.issues,
      });
      return;
    }

    const customer = await this.customerService.update(
      idResult.data.customerID,
      dataResult.data,
    );
    res.json(customerDetails(customer));
  }

  findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { email } });
  }
}

export function createCustomerRouter(customerService: CustomerService): Router {
  const router = Router();
  const controller = new CustomerController(customerService);

  router.use(requireAdmin);
  router.get('/', (_req, res) => controller.getAll(res));
  router.post('/', (req, res) => controller.create(req, res));
  router.patch('/:customerID', (req, res) => controller.update(req, res));
  router.delete('/:customerID', (req, res) => controller.delete(req, res));

  return router;
}
