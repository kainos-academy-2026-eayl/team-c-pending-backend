import type { Request, Response } from 'express';
import type { Customer } from '../generated/prisma/browser';
import prisma from '../prismaClient';
import type { CustomerService } from '../services/customer_service';

export class CustomerController {
  constructor(private customerService: CustomerService) {}

  async getAll(res: Response): Promise<void> {
    const customers = await this.customerService.findAll();
    res.json(customers);
  }

  async create(req: Request, res: Response): Promise<void> {
    const { firstname, lastname, email, password } = req.body;
    const _customer = await this.customerService.create({
      firstname,
      lastname,
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
