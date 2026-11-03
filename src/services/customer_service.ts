import { hash } from 'bcryptjs';
import type { Customer } from '../generated/prisma/client';
import type { CustomerRepository } from '../prisma_repo/customer_repository';

export class CustomerService {
  constructor(private CustomerRepository: CustomerRepository) {}

  findAll(): Promise<Customer[]> {
    return this.CustomerRepository.findMany();
  }

  async findByID(customerID: number): Promise<Customer | null> {
    return this.CustomerRepository.findByID(customerID);
  }
  async CheckRole(customerID: number): Promise<Customer> {
    return this.CustomerRepository.CheckRole(customerID);
  }

  async create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<Customer> {
    const hashedPassword = await hash(data.password, 12);

    return this.CustomerRepository.create({
      ...data,
      role: 'customer',
      password: hashedPassword,
    });
  }
}
