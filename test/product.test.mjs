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
  const product = { productID: 1, ...data };
  const repository = new ProductRepository();
  prisma.product.findMany.mockResolvedValue([product]);
  prisma.product.findUnique.mockResolvedValue(product);
  prisma.product.create.mockResolvedValue(product);
  prisma.product.update.mockResolvedValue(product);

  await expect(repository.findMany()).resolves.toEqual([product]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith({
    where: { hide: false },
  });
  await expect(repository.findManyForAdmin()).resolves.toEqual([product]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith();
  await expect(repository.findByCategory(data.category)).resolves.toEqual([
    product,
  ]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith({
    where: { category: data.category, hide: false },
  });
  await expect(repository.getProductCategories()).resolves.toEqual([
    data.category,
  ]);
  expect(prisma.product.findMany).toHaveBeenLastCalledWith({
    where: { hide: false },
    distinct: ['category'],
    select: { category: true },
  });
  await expect(repository.findByID(product.productID)).resolves.toBe(product);
  expect(prisma.product.findUnique).toHaveBeenLastCalledWith({
    where: { productID: product.productID },
    include: {
      reviews: {
        include: {
          customer: {
            select: { customerID: true, firstName: true, lastName: true },
          },
        },
      },
    },
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
});

test.each([true, false])(
  'product visibility can be set to %s without deleting the product',
  async (hide) => {
    const product = { productID: 1, hide };
    prisma.product.update.mockResolvedValue(product);
    const repository = new ProductRepository();
    const service = new ProductService(repository);

    await expect(service.update(1, { hide })).resolves.toBe(product);
    expect(prisma.product.update).toHaveBeenLastCalledWith({
      where: { productID: 1 },
      data: hide ? { hide, basketEntries: { deleteMany: {} } } : { hide },
    });
    expect(prisma.product.delete).not.toHaveBeenCalled();
  },
);

test('hiding also preserves other product edits in the atomic basket removal', async () => {
  const data = { hide: true, name: 'Updated lamp', quantity: 8 };
  const product = { productID: 1, ...data };
  prisma.product.update.mockResolvedValue(product);

  await expect(new ProductRepository().update(1, data)).resolves.toBe(product);
  expect(prisma.product.update).toHaveBeenLastCalledWith({
    where: { productID: 1 },
    data: { ...data, basketEntries: { deleteMany: {} } },
  });
});

test('hiding propagates failures from the atomic product and basket update', async () => {
  const error = new Error('Basket removal failed');
  prisma.product.update.mockRejectedValueOnce(error);

  await expect(new ProductRepository().update(1, { hide: true })).rejects.toBe(
    error,
  );
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
  const categories = ['lighting', 'kitchen'];
  const repository = {
    findMany: vi.fn().mockResolvedValue([product]),
    findManyForAdmin: vi.fn().mockResolvedValue([product]),
    findByID: vi.fn().mockResolvedValue(product),
    findByCategory: vi.fn().mockResolvedValue([product]),
    create: vi.fn().mockResolvedValue(product),
    getProductCategories: vi.fn().mockResolvedValue(categories),
  };
  const service = new ProductService(repository);

  await expect(service.findAll()).resolves.toEqual([product]);
  await expect(service.findAllForAdmin()).resolves.toEqual([product]);
  await expect(service.findByID(product.productID)).resolves.toBe(product);
  await expect(service.findByCategory(product.category)).resolves.toEqual([
    product,
  ]);
  await expect(service.getProductCategories()).resolves.toEqual(categories);

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
  expect(repository.findManyForAdmin).toHaveBeenCalledOnce();
  expect(repository.findByID).toHaveBeenCalledExactlyOnceWith(
    product.productID,
  );
  expect(repository.findByCategory).toHaveBeenCalledExactlyOnceWith(
    product.category,
  );
  expect(repository.getProductCategories).toHaveBeenCalledOnce();
  expect(repository.create).toHaveBeenCalledExactlyOnceWith(data);
});
