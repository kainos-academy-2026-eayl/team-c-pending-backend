import { expect, test, vi } from 'vitest';

vi.mock('../src/prismaClient.ts', () => ({
  default: {
    orderItem: { groupBy: vi.fn() },
    product: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

import { ProductController } from '../src/controllers/product_controller.ts';
import { ProductRepository } from '../src/prisma_repo/product_repository.ts';
import prisma from '../src/prismaClient.ts';
import { ProductService } from '../src/services/product_service.ts';

test('product repository delegates all operations to Prisma', async () => {
  const data = {
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
  };
  const product = { productID: 1, ...data };
  const repository = new ProductRepository();
  prisma.product.findMany.mockResolvedValue([product]);
  prisma.product.findUnique.mockResolvedValue(product);
  prisma.product.create.mockResolvedValue(product);
  prisma.product.update.mockResolvedValue(product);
  prisma.product.delete.mockResolvedValue(product);

  await expect(repository.findMany()).resolves.toEqual([product]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith();
  await expect(repository.findByCategory(data.category)).resolves.toEqual([
    product,
  ]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith({
    where: { category: data.category },
  });
  await expect(repository.findByID(product.productID)).resolves.toBe(product);
  expect(prisma.product.findUnique).toHaveBeenLastCalledWith({
    where: { productID: product.productID },
  });
  await expect(repository.create(data)).resolves.toBe(product);
  expect(prisma.product.create).toHaveBeenLastCalledWith({ data });
  const update = { quantity: 0 };
  await expect(repository.update(product.productID, update)).resolves.toBe(
    product,
  );
  expect(prisma.product.update).toHaveBeenLastCalledWith({
    where: { productID: product.productID },
    data: update,
  });
  await expect(repository.delete(product.productID)).resolves.toBe(product);
  expect(prisma.product.delete).toHaveBeenLastCalledWith({
    where: { productID: product.productID },
  });
});

test('best sellers rank by active units and restore database ranking order', async () => {
  prisma.orderItem.groupBy.mockResolvedValue([
    { productID: 9, _sum: { quantity: 20 } },
    { productID: 2, _sum: { quantity: 12 } },
  ]);
  prisma.product.findMany.mockResolvedValue([
    { productID: 2 },
    { productID: 9 },
  ]);
  const repository = new ProductRepository();
  await expect(repository.findBestSellers()).resolves.toEqual([
    { productID: 9 },
    { productID: 2 },
  ]);
  expect(prisma.orderItem.groupBy).toHaveBeenLastCalledWith({
    by: ['productID'],
    where: {
      quantity: { gt: 0 },
      itemStatus: { equals: 'active', mode: 'insensitive' },
      order: {
        status: {
          notIn: ['cancelled', 'canceled', 'refunded'],
          mode: 'insensitive',
        },
      },
    },
    _sum: { quantity: true },
    orderBy: [{ _sum: { quantity: 'desc' } }, { productID: 'asc' }],
    take: 12,
  });
  expect(prisma.product.findMany).toHaveBeenLastCalledWith({
    where: { productID: { in: [9, 2] } },
  });
});

test('best sellers return no products when there are no qualifying orders', async () => {
  prisma.orderItem.groupBy.mockResolvedValue([]);
  prisma.product.findMany.mockClear();
  await expect(new ProductRepository().findBestSellers()).resolves.toEqual([]);
  expect(prisma.product.findMany).not.toHaveBeenCalled();
});

test('best sellers report inconsistent product data', async () => {
  prisma.orderItem.groupBy.mockResolvedValue([{ productID: 9 }]);
  prisma.product.findMany.mockResolvedValue([]);
  await expect(new ProductRepository().findBestSellers()).rejects.toThrow(
    'Ranked product 9',
  );
});

test('product service delegates best-seller ranking', async () => {
  const products = [{ productID: 9 }];
  const repository = { findBestSellers: vi.fn().mockResolvedValue(products) };
  await expect(
    new ProductService(repository).findBestSellers(),
  ).resolves.toEqual(products);
  expect(repository.findBestSellers).toHaveBeenCalledOnce();
});

test.each([{ productID: 1, name: 'Desk lamp' }, null])(
  'product controller returns the product lookup result %j',
  async (product) => {
    prisma.product.findUnique.mockResolvedValue(product);
    const controller = new ProductController({});

    await expect(controller.findByProductID(1)).resolves.toBe(product);
    expect(prisma.product.findUnique).toHaveBeenLastCalledWith({
      where: { productID: 1 },
    });
  },
);

test('product service delegates its operations to the repository', async () => {
  const product = { productID: 1, name: 'Desk lamp', category: 'lighting' };
  const repository = {
    findMany: vi.fn().mockResolvedValue([product]),
    findByID: vi.fn().mockResolvedValue(product),
    findByCategory: vi.fn().mockResolvedValue([product]),
    create: vi.fn().mockResolvedValue(product),
  };
  const service = new ProductService(repository);

  await expect(service.findAll()).resolves.toEqual([product]);
  await expect(service.findByID(product.productID)).resolves.toBe(product);
  await expect(service.findByCategory(product.category)).resolves.toEqual([
    product,
  ]);

  const data = {
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
  };
  await expect(service.create(data)).resolves.toBe(product);

  expect(repository.findMany).toHaveBeenCalledOnce();
  expect(repository.findByID).toHaveBeenCalledExactlyOnceWith(
    product.productID,
  );
  expect(repository.findByCategory).toHaveBeenCalledExactlyOnceWith(
    product.category,
  );
  expect(repository.create).toHaveBeenCalledExactlyOnceWith(data);
});
