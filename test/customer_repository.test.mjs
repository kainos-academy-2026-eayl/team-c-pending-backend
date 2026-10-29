import { compare, getRounds } from 'bcryptjs';
import { beforeEach, expect, test, vi } from 'vitest';

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

import { CustomerRepository } from '../src/prisma_repo/customer_repository.ts';
import prisma from '../src/prismaClient.ts';

const customer = {
  customerID: 1,
  firstName: 'Test',
  lastName: 'Customer',
  email: 'test@example.com',
  password: 'stored-password-hash',
  role: 'customer',
};

let repository;

beforeEach(() => {
  vi.resetAllMocks();
  repository = new CustomerRepository();
});

test.each([{ customers: [customer] }, { customers: [] }])(
  'findMany returns Prisma results: $customers',
  async ({ customers }) => {
    prisma.customer.findMany.mockResolvedValue(customers);

    await expect(repository.findMany()).resolves.toBe(customers);
    expect(prisma.customer.findMany).toHaveBeenCalledExactlyOnceWith();
  },
);

test.each([
  ['findByEmail', customer.email, { email: customer.email }],
  ['findByID', customer.customerID, { customerID: customer.customerID }],
])(
  '%s looks up the customer and preserves a missing result',
  async (method, value, where) => {
    prisma.customer.findUnique
      .mockResolvedValueOnce(customer)
      .mockResolvedValueOnce(null);

    await expect(repository[method](value)).resolves.toBe(customer);
    await expect(repository[method](value)).resolves.toBeNull();
    expect(prisma.customer.findUnique).toHaveBeenCalledTimes(2);
    expect(prisma.customer.findUnique).toHaveBeenNthCalledWith(1, { where });
    expect(prisma.customer.findUnique).toHaveBeenNthCalledWith(2, { where });
  },
);

test('CheckRole rejects a missing customer', async () => {
  prisma.customer.findUnique.mockResolvedValue(null);

  await expect(repository.CheckRole(customer.customerID)).rejects.toThrow(
    'Customer not found',
  );
  expect(prisma.customer.findUnique).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: customer.customerID },
  });
});

test('CheckRole rejects the customer role', async () => {
  prisma.customer.findUnique.mockResolvedValue(customer);

  await expect(repository.CheckRole(customer.customerID)).rejects.toThrow(
    'Customers cannot perform this action',
  );
  expect(prisma.customer.findUnique).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: customer.customerID },
  });
});

test.each(['admin', 'staff', 'manager'])(
  'CheckRole returns the customer for the %s role',
  async (role) => {
    const allowedCustomer = { ...customer, role };
    prisma.customer.findUnique.mockResolvedValue(allowedCustomer);

    await expect(repository.CheckRole(customer.customerID)).resolves.toBe(
      allowedCustomer,
    );
    expect(prisma.customer.findUnique).toHaveBeenCalledExactlyOnceWith({
      where: { customerID: customer.customerID },
    });
  },
);

test('create passes all customer fields to Prisma', async () => {
  const { customerID: _customerID, ...data } = customer;
  prisma.customer.create.mockResolvedValue(customer);

  await expect(repository.create(data)).resolves.toBe(customer);
  expect(prisma.customer.create).toHaveBeenCalledExactlyOnceWith({ data });
});

test('update preserves fields without adding a password', async () => {
  const data = { firstName: 'Updated', role: 'staff' };
  const updatedCustomer = { ...customer, ...data };
  prisma.customer.update.mockResolvedValue(updatedCustomer);

  await expect(repository.update(customer.customerID, data)).resolves.toBe(
    updatedCustomer,
  );
  expect(prisma.customer.update).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: customer.customerID },
    data,
  });
});

test('update hashes the password with 12 rounds and preserves other fields', async () => {
  const data = { password: 'new-password', lastName: 'Updated', role: 'staff' };
  prisma.customer.update.mockResolvedValue(customer);

  await expect(repository.update(customer.customerID, data)).resolves.toBe(
    customer,
  );
  expect(prisma.customer.update).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: customer.customerID },
    data: { ...data, password: expect.any(String) },
  });
  const storedPassword = prisma.customer.update.mock.lastCall[0].data.password;
  expect(storedPassword).not.toBe(data.password);
  await expect(compare(data.password, storedPassword)).resolves.toBe(true);
  expect(getRounds(storedPassword)).toBe(12);
  expect(data.password).toBe('new-password');
});

test('delete uses the customer ID and returns the deleted customer', async () => {
  prisma.customer.delete.mockResolvedValue(customer);

  await expect(repository.delete(customer.customerID)).resolves.toBe(customer);
  expect(prisma.customer.delete).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: customer.customerID },
  });
});

test.each([
  ['findMany', 'findMany', []],
  ['findByEmail', 'findUnique', [customer.email]],
  ['findByID', 'findUnique', [customer.customerID]],
  ['CheckRole', 'findUnique', [customer.customerID]],
  ['create', 'create', [customer]],
  ['update', 'update', [customer.customerID, { role: 'staff' }]],
  ['delete', 'delete', [customer.customerID]],
])('%s propagates database failures', async (method, prismaMethod, args) => {
  const error = new Error('Database unavailable');
  prisma.customer[prismaMethod].mockRejectedValue(error);

  await expect(repository[method](...args)).rejects.toBe(error);
});
