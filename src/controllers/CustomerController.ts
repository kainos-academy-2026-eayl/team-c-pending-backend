import type { Request, Response } from 'express';
import type CustomerService from '../services/CustomerService';

export default class CustomerController {
  constructor(private customerService: CustomerService) {}

  async create(req: Request, res: Response): Promise<void> {
    const { firstname, lastname, email, password } = req.body;
    const customer = await this.customerService.create({
      firstname,
      lastname,
      email,
      password,
    });
    res.json({
      id: customer.id,
    });
  }
}
