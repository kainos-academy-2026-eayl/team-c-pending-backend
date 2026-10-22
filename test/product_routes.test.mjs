import { once } from 'node:events';
import 'dotenv/config';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createProductRouter } from '../src/controllers/product_controller.ts';

async function withServer(productService, run) {
  const app = express();
  app.use(express.json());
  app.use('/products', createProductRouter(productService));
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message });
  });
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('GET /products returns the public product fields', async () => {
  const product = {
    id: 1,
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    stock: true,
    image: 'https://example.com/lamp.png',
    internalNote: 'not public',
  };
  const service = { findAll: vi.fn().mockResolvedValue([product]) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`);

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
    expect(service.findAll).toHaveBeenCalledOnce();
  });
});

test('GET /products/category forwards the category and returns products', async () => {
  const product = {
    id: 1,
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    stock: true,
    image: 'https://example.com/lamp.png',
  };
  const service = {
    findByCategory: vi.fn().mockResolvedValue([product]),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/category?category=lighting`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([product]);
    expect(service.findByCategory).toHaveBeenCalledExactlyOnceWith('lighting');
  });
});

test('POST /products forwards product data to the service', async () => {
  const data = {
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    stock: true,
    image: 'https://example.com/lamp.png',
  };
  const service = { create: vi.fn().mockResolvedValue({ id: 1, ...data }) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toBe('All okay');
    expect(service.create).toHaveBeenCalledExactlyOnceWith(data);
  });
});

test.each([
  ['GET', '/products', 'findAll'],
  ['GET', '/products/category?category=lighting', 'findByCategory'],
  ['POST', '/products', 'create'],
])(
  '%s %s forwards service failures to Express',
  async (method, path, operation) => {
    const error = new Error('Database unavailable');
    const service = {
      findAll: vi.fn().mockRejectedValue(error),
      findByCategory: vi.fn().mockRejectedValue(error),
      create: vi.fn().mockRejectedValue(error),
    };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`, {
        method,
        ...(method === 'POST'
          ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name: 'Desk lamp' }),
            }
          : {}),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Database unavailable' });
      expect(service[operation]).toHaveBeenCalledOnce();
    });
  },
);
