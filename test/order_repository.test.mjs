import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('../src/prismaClient.ts', () => ({
  default: {
    order: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    product: { findMany: vi.fn() },
    orderItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));

import { OrderRepository } from '../src/prisma_repo/order_repository.ts';
import prisma from '../src/prismaClient.ts';

const transaction = {
  order: {
    findUniqueOrThrow: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  product: { findMany: vi.fn() },
  orderItem: { deleteMany: vi.fn() },
};

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(transaction));
});

test('order reads include their OrderItem records', async () => {
  const orders = [{ orderID: 1, orderItems: [{ orderItemID: 10 }] }];
  const repository = new OrderRepository();
  prisma.order.findMany.mockResolvedValue(orders);
  prisma.order.findUnique.mockResolvedValue(orders[0]);

  await expect(repository.findOrdersByCustomerID(42)).resolves.toBe(orders);
  expect(prisma.order.findMany).toHaveBeenLastCalledWith({
    where: { customerID: 42 },
    include: { orderItems: true },
  });

  await expect(repository.findOrderByID(1, 42)).resolves.toBe(orders[0]);
  expect(prisma.order.findUnique).toHaveBeenCalledWith({
    where: { orderID: 1, customerID: 42 },
    include: { orderItems: true },
  });
});

test('create order snapshots current product prices into OrderItem records', async () => {
  const order = { orderID: 1, customerID: 42, orderItems: [] };
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: 4.5 },
  ]);
  transaction.order.create.mockResolvedValue(order);
  const repository = new OrderRepository();

  await expect(
    repository.createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: [{ productID: 7, quantity: 2 }],
    }),
  ).resolves.toBe(order);

  expect(transaction.product.findMany).toHaveBeenCalledWith({
    where: { productID: { in: [7] } },
    select: { productID: true, price: true },
  });
  expect(transaction.order.create).toHaveBeenCalledWith({
    data: {
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: {
        create: [{ productID: 7, quantity: 2, unitPrice: 4.5 }],
      },
    },
    include: { orderItems: true },
  });
  expect(prisma.$transaction).toHaveBeenCalledOnce();
});

test('create order rejects product IDs that do not exist', async () => {
  transaction.product.findMany.mockResolvedValue([]);
  const repository = new OrderRepository();

  await expect(
    repository.createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: [{ productID: 99, quantity: 1 }],
    }),
  ).rejects.toMatchObject({
    name: 'OrderProductsNotFoundError',
    productIDs: [99],
  });

  expect(transaction.order.create).not.toHaveBeenCalled();
});

test('create order without items skips product lookup', async () => {
  const order = { orderID: 1, orderItems: [] };
  transaction.order.create.mockResolvedValue(order);
  const data = {
    customerID: 42,
    status: 'pending',
    type: 'delivery',
    orderItems: [],
  };

  await expect(new OrderRepository().createOrder(data)).resolves.toBe(order);
  expect(transaction.product.findMany).not.toHaveBeenCalled();
  expect(transaction.order.create).toHaveBeenCalledExactlyOnceWith({
    data: {
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: { create: [] },
    },
    include: { orderItems: true },
  });
});

test('create order rejects an unavailable product price before writing', async () => {
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: undefined },
  ]);
  await expect(
    new OrderRepository().createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: [{ productID: 7, quantity: 1 }],
    }),
  ).rejects.toMatchObject({
    name: 'OrderProductsNotFoundError',
    productIDs: [7],
  });
  expect(transaction.order.create).not.toHaveBeenCalled();
});
test('update scopes the order to its customer', async () => {
  const order = { orderID: 1, customerID: 43 };
  prisma.order.update.mockResolvedValue(order);
  const repository = new OrderRepository();

  await expect(
    repository.updateOrder(1, { status: 'processing' }, 42),
  ).resolves.toBe(order);
  expect(prisma.order.update).toHaveBeenCalledWith({
    where: { orderID: 1, customerID: 42 },
    data: { status: 'processing' },
    include: { orderItems: true },
  });
});

test('delete removes OrderItems before deleting their order atomically', async () => {
  const order = { orderID: 1, orderItems: [{ orderItemID: 10 }] };
  transaction.order.findUniqueOrThrow.mockResolvedValue(order);
  const repository = new OrderRepository();

  await expect(repository.delete(1, 42)).resolves.toBe(order);

  expect(transaction.order.findUniqueOrThrow).toHaveBeenCalledWith({
    where: { orderID: 1, customerID: 42 },
    include: { orderItems: true },
  });
  expect(transaction.orderItem.deleteMany).toHaveBeenCalledWith({
    where: { orderID: 1 },
  });
  expect(transaction.order.delete).toHaveBeenCalledWith({
    where: { orderID: 1 },
  });
});
