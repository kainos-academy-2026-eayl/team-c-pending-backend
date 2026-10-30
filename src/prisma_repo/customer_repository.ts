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
  findByID(customerID: number): Promise<Customer | null> {
    return prisma.customer.findUnique({ where: { customerID } });
  }

  //finds specific customers with IDs;
  async CheckRole(customerID: number): Promise<Customer> {
    const customer = await prisma.customer.findUnique({
      where: { customerID },
    });

    if (!customer) {
      throw new Error('Customer not found');
    }

    if (customer.role === 'customer') {
      throw new Error('Customers cannot perform this action');
    }

    return customer;
  }

  // creates new customer in database
  create(data: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    role: string;
  }): Promise<Customer> {
    return prisma.customer.create({ data });
  }
  // updates customer in database
  async update(
    customerID: number,
    data: Partial<{
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
    }>,
    // hashes passsword being updated
  ): Promise<Customer> {
    const updateData =
      data.password === undefined
        ? data
        : { ...data, password: await hash(data.password, 12) };

    return prisma.customer.update({ where: { customerID }, data: updateData });
  }
  // deletes customer from database
  delete(customerID: number): Promise<Customer> {
    return prisma.customer.delete({ where: { customerID } });
  }
}
