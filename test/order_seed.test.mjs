import { afterEach, beforeEach, expect, test, vi } from 'vitest';

vi.mock('../src/prismaClient.ts', () => ({
  default: {
    customer: { findFirst: vi.fn() },
    product: { findMany: vi.fn() },
    order: { create: vi.fn() },
    $transaction: vi.fn(),
    $disconnect: vi.fn(),
  },
}));

import prisma from '../src/prismaClient.ts';

const originalExitCode = process.exitCode;

beforeEach(() => {
  vi.resetModules();
  vi.resetAllMocks();
  process.exitCode = originalExitCode;
  vi.spyOn(console, 'log').mockImplementation(() => {});
  vi.spyOn(console, 'error').mockImplementation(() => {});
  prisma.customer.findFirst.mockResolvedValue({ customerID: 42 });
  prisma.product.findMany.mockResolvedValue([
    { productID: 7 },
    { productID: 12 },
  ]);
  prisma.$transaction.mockResolvedValue([
    { orderID: 101 },
    { orderID: 102 },
    { orderID: 103 },
  ]);
});

afterEach(() => {
  process.exitCode = originalExitCode;
  vi.restoreAllMocks();
});

test('seed creates linked orders using existing IDs in one transaction', async () => {
  await import('../src/seed.ts');

  const orders = prisma.order.create.mock.calls.map(([input]) => input.data);
  expect(orders).toHaveLength(3);
  expect(orders.map((order) => order.customerID)).toEqual([42, 42, 42]);
  expect(orders.map((order) => order.status)).toEqual([
    'pending',
    'processing',
    'completed',
  ]);
  expect(orders.map((order) => order.type)).toEqual([
    'delivery',
    'collection',
    'delivery',
  ]);
  expect(orders.flatMap((order) => order.productOrders.create)).toEqual([
    { ProductID: 7, Quantity: 2 },
    { ProductID: 12, Quantity: 1 },
    { ProductID: 12, Quantity: 3 },
    { ProductID: 7, Quantity: 1 },
  ]);
  expect(prisma.$transaction).toHaveBeenCalledOnce();
  expect(console.log).toHaveBeenCalledWith(expect.any(String), [101, 102, 103]);
  expect(prisma.$disconnect).toHaveBeenCalledOnce();
  expect(process.exitCode).toBe(originalExitCode);
});

test.each([
  [null, [{ productID: 7 }, { productID: 12 }]],
  [{ customerID: 42 }, []],
  [{ customerID: 42 }, [{ productID: 7 }]],
])('seed rejects missing prerequisite records', async (customer, products) => {
  prisma.customer.findFirst.mockResolvedValue(customer);
  prisma.product.findMany.mockResolvedValue(products);

  await import('../src/seed.ts');

  expect(prisma.order.create).not.toHaveBeenCalled();
  expect(prisma.$transaction).not.toHaveBeenCalled();
  expect(console.error).toHaveBeenCalledWith(
    'Order seed failed:',
    expect.objectContaining({
      message: expect.stringContaining('at least one existing customer'),
    }),
  );
  expect(process.exitCode).toBe(1);
  expect(prisma.$disconnect).toHaveBeenCalledOnce();
});

test('seed reports database failures and disconnects', async () => {
  const error = new Error('Database unavailable');
  prisma.$transaction.mockRejectedValue(error);

  await import('../src/seed.ts');

  expect(console.error).toHaveBeenCalledWith('Order seed failed:', error);
  expect(console.log).not.toHaveBeenCalled();
  expect(process.exitCode).toBe(1);
  expect(prisma.$disconnect).toHaveBeenCalledOnce();
});
