import { compare, getRounds } from 'bcryptjs';
import { expect, test, vi } from 'vitest';

vi.mock('../src/prismaClient.ts', () => ({
  default: {
    customer: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { CustomerController } from '../src/controllers/customer_controller.ts';
import { CustomerRepository } from '../src/prisma_repo/customer_repository.ts';
import prisma from '../src/prismaClient.ts';
import { CustomerService } from '../src/services/customer_service.ts';

test('customer repository delegates all operations to Prisma', async () => {
  const customer = { customerID: 1, email: 'user@example.com' };
  const repository = new CustomerRepository();
  prisma.customer.findMany.mockResolvedValue([customer]);
  prisma.customer.findUnique.mockResolvedValue(customer);
  prisma.customer.create.mockResolvedValue(customer);
  prisma.customer.update.mockResolvedValue(customer);
  prisma.customer.delete.mockResolvedValue(customer);

  await expect(repository.findMany()).resolves.toEqual([customer]);
  await expect(repository.findByEmail(customer.email)).resolves.toBe(customer);
  expect(prisma.customer.findUnique).toHaveBeenLastCalledWith({
    where: { email: customer.email },
  });
  await expect(repository.findByID(customer.customerID)).resolves.toBe(
    customer,
  );
  expect(prisma.customer.findUnique).toHaveBeenLastCalledWith({
    where: { customerID: customer.customerID },
  });
  await expect(
    repository.create({
      firstname: 'Test',
      lastname: 'Customer',
      email: customer.email,
      password: 'hashed-password',
    }),
  ).resolves.toBe(customer);
  await expect(
    repository.update(customer.customerID, { firstname: 'Updated' }),
  ).resolves.toBe(customer);
  await expect(
    repository.update(customer.customerID, { password: 'updated-password' }),
  ).resolves.toBe(customer);
  expect(prisma.customer.update).toHaveBeenLastCalledWith({
    where: { customerID: customer.customerID },
    data: { password: expect.any(String) },
  });
  const storedPassword = prisma.customer.update.mock.lastCall[0].data.password;
  expect(storedPassword).not.toBe('updated-password');
  await expect(compare('updated-password', storedPassword)).resolves.toBe(true);
  expect(getRounds(storedPassword)).toBe(12);
  await expect(repository.delete(customer.customerID)).resolves.toBe(customer);
  expect(prisma.customer.delete).toHaveBeenLastCalledWith({
    where: { customerID: customer.customerID },
  });
});

test('customer service delegates its operations to the repository', async () => {
  const customer = { customerID: 1, email: 'user@example.com' };
  const repository = {
    findMany: vi.fn().mockResolvedValue([customer]),
    findByID: vi.fn().mockResolvedValue(customer),
    create: vi.fn().mockResolvedValue(customer),
  };
  const service = new CustomerService(repository);

  await expect(service.findAll()).resolves.toEqual([customer]);
  await expect(service.findByID(customer.customerID)).resolves.toBe(customer);
  const data = {
    firstname: 'Test',
    lastname: 'Customer',
    email: customer.email,
    password: 'hashed-password',
  };
  await expect(service.create(data)).resolves.toBe(customer);

  expect(repository.findMany).toHaveBeenCalledOnce();
  expect(repository.findByID).toHaveBeenCalledExactlyOnceWith(
    customer.customerID,
  );
  expect(repository.create).toHaveBeenCalledExactlyOnceWith({
    ...data,
    password: expect.any(String),
  });
  const storedPassword = repository.create.mock.calls[0][0].password;
  expect(storedPassword).not.toBe(data.password);
  await expect(compare(data.password, storedPassword)).resolves.toBe(true);
  expect(getRounds(storedPassword)).toBe(12);
});

test('customer controller looks up a customer by email', async () => {
  const customer = { customerID: 1, email: 'user@example.com' };
  prisma.customer.findUnique.mockResolvedValue(customer);
  const controller = new CustomerController({});

  await expect(controller.findByEmail(customer.email)).resolves.toBe(customer);
  expect(prisma.customer.findUnique).toHaveBeenCalledWith({
    where: { email: customer.email },
  });
});
