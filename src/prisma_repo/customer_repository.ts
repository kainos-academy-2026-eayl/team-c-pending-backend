import { hash } from 'bcryptjs';
import type { Customer } from '../generated/prisma/client';
import prisma from '../prismaClient';

export class CustomerRepository {
  // gets all customers from database
  findMany(): Promise<Customer[]> {
    return prisma.customer.findMany();
  }
  //finds specific customers with emails
  findByEmail(email: string): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { email } });
  }
  //finds specific customers with IDs
  findById(id: number): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { id } });
  }

  // creates new customer in database
  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<Customer> {
    return prisma.customer.create({ data });
  }
  // updates customer in database
  async update(
    id: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }>,
    // hashes passsword being updated
  ): Promise<Customer> {
    const updateData =
      data.password === undefined
        ? data
        : { ...data, password: await hash(data.password, 12) };

    return prisma.customer.update({ where: { id }, data: updateData });
  }
  // deletes customer from database 
  delete(id: number): Promise<Customer> {
    return prisma.customer.delete({ where: { id } });
  }
}
