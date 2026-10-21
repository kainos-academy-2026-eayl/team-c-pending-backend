import { hash } from 'bcryptjs';
import type { Customer } from '../generated/prisma/client';
import prisma from '../prismaClient';

export class CustomerRepository {
  findMany(): Promise<Customer[]> {
    return prisma.customer.findMany();
  }

  findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { email } });
  }

  findById(id: number): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { id } });
  }

  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<Customer> {
    return prisma.customer.create({ data });
  }

  async update(
    id: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }>,
  ): Promise<Customer> {
    const updateData = data.password === undefined
      ? data
      : { ...data, password: await hash(data.password, 12) };

    return prisma.customer.update({ where: { id }, data: updateData });
  }

  delete(id: number): Promise<Customer> {
    return prisma.customer.delete({ where: { id } });
  }
}
