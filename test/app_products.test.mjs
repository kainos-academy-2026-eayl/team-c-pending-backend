import { once } from 'node:events';
import { readFile } from 'node:fs/promises';
import { expect, test, vi } from 'vitest';
import { createApp } from '../src/app.ts';

vi.mock('../src/prisma_repo/product_repository.ts', () => ({
  ProductRepository: class {
    findMany() {
      return Promise.resolve([
        {
          productID: 1,
          name: 'Desk lamp',
          price: 24.5,
          description: 'Adjustable task light',
          category: 'lighting',
          quantity: 8,
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
        productID: 1,
        name: 'Desk lamp',
        price: 24.5,
        description: 'Adjustable task light',
        category: 'lighting',
        quantity: 8,
        image: 'https://example.com/lamp.png',
      },
    ]);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });

  }
});

test('createApp serves image files at /images', async () => {
  const app = createApp();
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    const response = await fetch(
      `http://127.0.0.1:${server.address().port}/images/mask.jpg`,
    );

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('image/jpeg');
    expect(Buffer.from(await response.arrayBuffer())).toEqual(
      await readFile(new URL('../images/mask.jpg', import.meta.url)),
    );
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
});
