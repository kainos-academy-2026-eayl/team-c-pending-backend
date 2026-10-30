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
    basketEntry: { findMany: vi.fn(), deleteMany: vi.fn() },
    productOrder: { deleteMany: vi.fn() },
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
  product: { findMany: vi.fn(), updateMany: vi.fn() },
  basketEntry: { findMany: vi.fn(), deleteMany: vi.fn() },
  productOrder: { deleteMany: vi.fn() },
  orderItem: { deleteMany: vi.fn() },
};

beforeEach(() => {
  vi.resetAllMocks();
  prisma.$transaction.mockImplementation((callback) => callback(transaction));
  transaction.basketEntry.findMany.mockResolvedValue([
    { productID: 7, quantity: 2 },
  ]);
  transaction.product.updateMany.mockResolvedValue({ count: 1 });
});

test('order reads include their OrderItem records', async () => {
  const orders = [{ orderID: 1, orderItems: [{ orderItemID: 10 }] }];
  const repository = new OrderRepository(prisma);
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
    { productID: 7, price: 4.5, quantity: 2 },
  ]);
  transaction.order.create.mockResolvedValue(order);
  const repository = new OrderRepository();

  await expect(
    repository.createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
    }),
  ).resolves.toBe(order);

  expect(transaction.product.findMany).toHaveBeenCalledWith({
    where: { productID: { in: [7] } },
    select: { productID: true, price: true, quantity: true },
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
  expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
    isolationLevel: 'Serializable',
  });
  expect(transaction.basketEntry.findMany).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: 42 },
    select: { productID: true, quantity: true },
  });
  expect(transaction.basketEntry.deleteMany).toHaveBeenCalledExactlyOnceWith({
    where: { customerID: 42 },
  });
  expect(transaction.product.updateMany).toHaveBeenCalledExactlyOnceWith({
    where: { productID: 7, quantity: { gte: 2 } },
    data: { quantity: { decrement: 2 } },
  });
  expect(transaction.order.create.mock.invocationCallOrder[0]).toBeLessThan(
    transaction.basketEntry.deleteMany.mock.invocationCallOrder[0],
  );
});

test('create order rejects product IDs that do not exist', async () => {
  transaction.product.findMany.mockResolvedValue([]);
  const repository = new OrderRepository();

  await expect(
    repository.createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
    }),
  ).rejects.toMatchObject({
    name: 'OrderProductsNotFoundError',
    productIDs: [7],
  });

  expect(transaction.order.create).not.toHaveBeenCalled();
  expect(transaction.basketEntry.deleteMany).not.toHaveBeenCalled();
});

test('create order rejects an empty basket without writing or clearing it', async () => {
  transaction.basketEntry.findMany.mockResolvedValue([]);
  const data = {
    customerID: 42,
    status: 'pending',
    type: 'delivery',
  };

  await expect(new OrderRepository().createOrder(data)).rejects.toMatchObject({
    name: 'OrderBasketEmptyError',
    message: 'Basket is empty',
  });
  expect(transaction.product.findMany).not.toHaveBeenCalled();
  expect(transaction.order.create).not.toHaveBeenCalled();
  expect(transaction.basketEntry.deleteMany).not.toHaveBeenCalled();
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
    }),
  ).rejects.toMatchObject({
    name: 'OrderProductsNotFoundError',
    productIDs: [7],
  });
  expect(transaction.order.create).not.toHaveBeenCalled();
});
test.each([
  [0, [{ productID: 7, quantity: 1 }]],
  [2, [{ productID: 7, quantity: 3 }]],
  [
    3,
    [
      { productID: 7, quantity: 2 },
      { productID: 7, quantity: 2 },
    ],
  ],
])(
  'rejects orders exceeding stock %i, including repeated products',
  async (quantity, orderItems) => {
    transaction.basketEntry.findMany.mockResolvedValue(orderItems);
    transaction.product.findMany.mockResolvedValue([
      { productID: 7, price: 4.5, quantity },
    ]);
    await expect(
      new OrderRepository().createOrder({
        customerID: 42,
        status: 'pending',
        type: 'delivery',
      }),
    ).rejects.toMatchObject({
      name: 'OrderInsufficientStockError',
      productIDs: [7],
    });
    expect(transaction.order.create).not.toHaveBeenCalled();
    expect(transaction.basketEntry.deleteMany).not.toHaveBeenCalled();
  },
);

test('allows repeated products whose combined quantity exactly matches stock', async () => {
  transaction.basketEntry.findMany.mockResolvedValue([
    { productID: 7, quantity: 1 },
    { productID: 8, quantity: 2 },
    { productID: 7, quantity: 2 },
  ]);
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: 4.5, quantity: 3 },
    { productID: 8, price: 2, quantity: 10 },
  ]);
  const order = { orderID: 1, orderItems: [] };
  transaction.order.create.mockResolvedValue(order);
  await expect(
    new OrderRepository().createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
    }),
  ).resolves.toBe(order);
  expect(transaction.order.create).toHaveBeenCalledExactlyOnceWith({
    data: {
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: {
        create: [
          { productID: 7, quantity: 1, unitPrice: 4.5 },
          { productID: 8, quantity: 2, unitPrice: 2 },
          { productID: 7, quantity: 2, unitPrice: 4.5 },
        ],
      },
    },
    include: { orderItems: true },
  });
  expect(transaction.product.updateMany.mock.calls).toEqual([
    [
      {
        where: { productID: 7, quantity: { gte: 3 } },
        data: { quantity: { decrement: 3 } },
      },
    ],
    [
      {
        where: { productID: 8, quantity: { gte: 2 } },
        data: { quantity: { decrement: 2 } },
      },
    ],
  ]);
});

test('rejects a checkout when a concurrent stock deduction wins', async () => {
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: 4.5, quantity: 2 },
  ]);
  transaction.product.updateMany.mockResolvedValue({ count: 0 });

  await expect(
    new OrderRepository().createOrder({
      customerID: 42,
      type: 'delivery',
    }),
  ).rejects.toMatchObject({
    name: 'OrderInsufficientStockError',
    productIDs: [7],
  });
  expect(transaction.order.create).not.toHaveBeenCalled();
  expect(transaction.basketEntry.deleteMany).not.toHaveBeenCalled();
});

test('order creation failures leave the basket untouched', async () => {
  const error = new Error('Order creation failed');
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: 4.5, quantity: 3 },
  ]);
  transaction.order.create.mockRejectedValue(error);

  await expect(
    new OrderRepository().createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
    }),
  ).rejects.toBe(error);
  expect(transaction.basketEntry.deleteMany).not.toHaveBeenCalled();
});

test('basket clearing failures reject the checkout transaction', async () => {
  const error = new Error('Basket clearing failed');
  transaction.product.findMany.mockResolvedValue([
    { productID: 7, price: 4.5, quantity: 3 },
  ]);
  transaction.order.create.mockResolvedValue({ orderID: 1 });
  transaction.basketEntry.deleteMany.mockRejectedValue(error);

  await expect(
    new OrderRepository().createOrder({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
    }),
  ).rejects.toBe(error);
  expect(transaction.order.create).toHaveBeenCalledOnce();
});

test('update is scoped to the customer and cannot reassign order ownership', async () => {
  const order = { orderID: 1, customerID: 43 };
  prisma.order.update.mockResolvedValue(order);
  const repository = new OrderRepository();

  await expect(
    repository.updateOrder(1, { status: 'processing', customerID: 99 }, 43),
  ).resolves.toBe(order);
  expect(prisma.order.update).toHaveBeenCalledWith({
    where: { orderID: 1, customerID: 43 },
    data: { status: 'processing', type: undefined },
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
  expect(transaction.productOrder.deleteMany).toHaveBeenCalledWith({
    where: { OrderID: 1 },
  });
  expect(transaction.order.delete).toHaveBeenCalledWith({
    where: { orderID: 1, customerID: 42 },
  });
});
