import { expect, test, vi } from 'vitest';
import { ProductService } from '../src/services/product_service.ts';

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
    stock: true,
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
