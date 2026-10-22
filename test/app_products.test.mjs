import { once } from 'node:events';
import { expect, test, vi } from 'vitest';
import { createApp } from '../src/app.ts';

vi.mock('../src/prisma_repo/product_repository.ts', () => ({
  ProductRepository: class {
    findMany() {
      return Promise.resolve([
        {
          id: 1,
          name: 'Desk lamp',
          price: 24.5,
          description: 'Adjustable task light',
          category: 'lighting',
          quantity: 8,
          stock: true,
          image: 'https://example.com/lamp.png',
        },
      ]);
    }
  },
}));

test('createApp mounts the product router at /products', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/products`,
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 1,
        name: 'Desk lamp',
        price: 24.5,
        description: 'Adjustable task light',
        category: 'lighting',
        quantity: 8,
        stock: true,
        image: 'https://example.com/lamp.png',
      },
    ]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
