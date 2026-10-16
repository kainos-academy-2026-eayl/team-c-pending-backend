import type { Customer } from '../generated/prisma/client';
import prisma from '../prismaClient';

export default class CustomerRepository {
  findMany(): Promise<Customer[]> {
    return prisma.customer.findMany();
  }

  findById(id: number): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { id } });
  }

  create(data: {
    firstname: string;
    lastname: string;
    email: string;
    password: string;
  }): Promise<Customer> {
    return prisma.customer.create({ data });
  }

  update(
    id: number,
    data: Partial<{
      firstname: string;
      lastname: string;
      email: string;
      password: string;
    }>,
  ): Promise<Customer> {
    return prisma.customer.update({ where: { id }, data });
  }

  delete(id: number): Promise<Customer> {
    return prisma.customer.delete({ where: { id } });
  }
}
