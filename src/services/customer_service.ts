import type { Customer } from '../generated/prisma/client';
import type { CustomerRepository } from '../prisma_repo/customer_repository';

export class CustomerService {
  constructor(private CustomerRepository: CustomerRepository) {}

  findAll(): Promise<Customer[]> {
    return this.CustomerRepository.findMany();
  }

  async findById(id: number): Promise<Customer | null> {
    return this.CustomerRepository.findById(id);
  }

  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<Customer> {
    return this.CustomerRepository.create(data);
  }
}
