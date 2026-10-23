import { expect, test, vi } from 'vitest';

vi.mock('../src/prismaClient.ts', () => ({
  default: {
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
  const product = { id: 1, ...data };
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
  await expect(repository.findById(product.id)).resolves.toBe(product);
  expect(prisma.product.findUnique).toHaveBeenLastCalledWith({
    where: { id: product.id },
  });
  await expect(repository.create(data)).resolves.toBe(product);
  expect(prisma.product.create).toHaveBeenLastCalledWith({ data });
  const update = { quantity: 0, stock: false };
  await expect(repository.update(product.id, update)).resolves.toBe(product);
  expect(prisma.product.update).toHaveBeenLastCalledWith({
    where: { id: product.id },
    data: update,
  });
  await expect(repository.delete(product.id)).resolves.toBe(product);
  expect(prisma.product.delete).toHaveBeenLastCalledWith({
    where: { id: product.id },
  });
});

test.each([{ id: 1, name: 'Desk lamp' }, null])(
  'product controller returns the product lookup result %j',
  async (product) => {
    prisma.product.findUnique.mockResolvedValue(product);
    const controller = new ProductController({});

    await expect(controller.findById(1)).resolves.toBe(product);
    expect(prisma.product.findUnique).toHaveBeenLastCalledWith({
      where: { id: 1 },
    });
  },
);

test('product service delegates its operations to the repository', async () => {
  const product = { id: 1, name: 'Desk lamp', category: 'lighting' };
  const repository = {
    findMany: vi.fn().mockResolvedValue([product]),
    findById: vi.fn().mockResolvedValue(product),
    findByCategory: vi.fn().mockResolvedValue([product]),
    create: vi.fn().mockResolvedValue(product),
  };
  const service = new ProductService(repository);

  await expect(service.findAll()).resolves.toEqual([product]);
  await expect(service.findById(product.id)).resolves.toBe(product);
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
  expect(repository.findById).toHaveBeenCalledExactlyOnceWith(product.id);
  expect(repository.findByCategory).toHaveBeenCalledExactlyOnceWith(
    product.category,
  );
  expect(repository.create).toHaveBeenCalledExactlyOnceWith(data);
});
