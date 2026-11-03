import { once } from 'node:events';
import 'dotenv/config';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createProductRouter } from '../src/controllers/product_controller.ts';
import { Prisma } from '../src/generated/prisma/client.ts';
import { ProductRepository } from '../src/prisma_repo/product_repository.ts';
import { ProductService } from '../src/services/product_service.ts';

const prismaMock = vi.hoisted(() => ({
  product: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('../src/prismaClient.ts', () => ({ default: prismaMock }));

import prisma from '../src/prismaClient.ts';

function validProductData() {
  return {
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
  };
}

async function withServer(productService, run) {
  const app = express();
  app.use(express.json());
  app.locals.loginService = {
    getCustomerDetailsFromToken: vi.fn().mockImplementation(async (token) => {
      if (token === 'non-admin-token') return { role: 'customer' };
      return { role: 'admin' };
    }),
  };
  app.locals.basketService = {};
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
    productID: 1,
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
    internalNote: 'not public',
  };
  const service = { findAll: vi.fn().mockResolvedValue([product]) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`);

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
    expect(service.findAll).toHaveBeenCalledOnce();
  });
});

test('GET /products/category forwards the category and returns products', async () => {
  const product = {
    productID: 1,
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
  };
  const service = {
    findByCategory: vi.fn().mockResolvedValue([product]),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/category?category=lighting`);

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
    expect(service.findByCategory).toHaveBeenCalledExactlyOnceWith('lighting');
  });
});

test.each(['/products/category', '/products/category?category='])(
  'GET %s rejects a missing or empty category',
  async (path) => {
    const service = { findByCategory: vi.fn() };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid category query',
        issues: expect.any(Array),
      });
      expect(service.findByCategory).not.toHaveBeenCalled();
    });
  },
);

test('GET /products/categories returns distinct categories', async () => {
  prisma.product.findMany.mockResolvedValue([
    { category: 'lighting' },
    { category: 'kitchen' },
  ]);

  await withServer({}, async (url) => {
    const response = await fetch(`${url}/products/categories`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['lighting', 'kitchen']);
    expect(prisma.product.findMany).toHaveBeenCalledExactlyOnceWith({
      where: { hide: false },
      distinct: ['category'],
      select: { category: true },
    });
  });
});

test('GET /products/admin includes hidden products and their visibility', async () => {
  const products = [
    { productID: 1, ...validProductData(), hide: true },
    { productID: 2, ...validProductData(), hide: false },
  ];
  const service = { findAllForAdmin: vi.fn().mockResolvedValue(products) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/admin`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(products);
    expect(service.findAllForAdmin).toHaveBeenCalledOnce();
  });
});

test.each([true, false])(
  'PATCH /products/:productID sets hide to %s',
  async (hide) => {
    const service = {
      update: vi.fn().mockResolvedValue({ productID: 1, hide }),
    };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/products/1`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hide }),
      });
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ productID: 1, hide });
      expect(service.update).toHaveBeenCalledExactlyOnceWith(1, { hide });
    });
  },
);

test.each([{}, { hide: 'true' }, { hide: 1 }, { hide: null }])(
  'PATCH /products/:productID rejects invalid visibility data %j',
  async (data) => {
    const service = { update: vi.fn() };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/products/1`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      expect(response.status).toBe(400);
      expect(service.update).not.toHaveBeenCalled();
    });
  },
);

test.each([
  ['P2025', 404],
  ['P1001', 500],
  [null, 500],
])('PATCH visibility handles failure %s', async (code, status) => {
  const error = code
    ? new Prisma.PrismaClientKnownRequestError('Database failure', {
        code,
        clientVersion: '7.10.1',
      })
    : new Error('Database failure');
  const service = { update: vi.fn().mockRejectedValue(error) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/1`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ hide: true }),
    });
    expect(response.status).toBe(status);
    expect((await response.json()).error).toBeTruthy();
  });
});

test.each([
  ['GET', '/products/admin', undefined, 401],
  ['GET', '/products/admin', 'non-admin-token', 403],
  ['PATCH', '/products/1', undefined, 401],
  ['PATCH', '/products/1', 'non-admin-token', 403],
])(
  '%s %s rejects unauthorized visibility access',
  async (method, path, token, status) => {
    const service = { update: vi.fn(), findAllForAdmin: vi.fn() };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
        },
        ...(method === 'PATCH' ? { body: JSON.stringify({ hide: true }) } : {}),
      });
      expect(response.status).toBe(status);
      expect(service.update).not.toHaveBeenCalled();
      expect(service.findAllForAdmin).not.toHaveBeenCalled();
    });
  },
);

test.each([
  [{ productID: 7, quantity: 3 }, true],
  [{ productID: 7, quantity: 0 }, false],
  [null, false],
])(
  'GET /products/7/in-stock returns %s for the product lookup',
  async (product, inStock) => {
    prisma.product.findUnique.mockResolvedValue(product);

    await withServer({}, async (url) => {
      const response = await fetch(`${url}/products/7/in-stock`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ inStock });
      expect(prisma.product.findUnique).toHaveBeenCalledWith({
        where: { productID: 7 },
      });
    });
  },
);

test.each(['/products/not-a-number/in-stock', '/products/0/in-stock'])(
  'GET %s rejects an invalid product ID',
  async (path) => {
    prisma.product.findUnique.mockClear();

    await withServer({}, async (url) => {
      const response = await fetch(`${url}${path}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid product id',
        issues: expect.any(Array),
      });
      expect(prisma.product.findUnique).not.toHaveBeenCalled();
    });
  },
);

test('POST /products forwards product data to the service', async () => {
  const data = {
    name: 'Desk lamp',
    price: 24.5,
    description: 'Adjustable task light',
    category: 'lighting',
    quantity: 8,
    image: 'https://example.com/lamp.png',
  };
  const service = {
    create: vi.fn().mockResolvedValue({ productID: 1, ...data }),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toBe('All okay');
    expect(service.create).toHaveBeenCalledExactlyOnceWith(data);
  });
});

test('POST /products defaults an omitted image to null', async () => {
  const data = validProductData();
  delete data.image;
  const service = {
    create: vi.fn().mockResolvedValue({ productID: 1, ...data }),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(200);
    expect(service.create).toHaveBeenCalledExactlyOnceWith({
      ...data,
      image: null,
    });
  });
});

test('PATCH /products/:productID updates product details', async () => {
  const changes = {
    name: 'Updated lamp',
    price: 29,
    description: 'Updated description',
    category: 'lighting',
    quantity: 4,
    image: null,
  };
  const service = {
    update: vi.fn().mockResolvedValue({ productID: 1, ...changes }),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/1`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ productID: 1, ...changes });
    expect(service.update).toHaveBeenCalledExactlyOnceWith(1, changes);
  });
});

test.each([
  [{ ...validProductData(), price: '24.5' }],
  [{ ...validProductData(), quantity: -1 }],
  [{ ...validProductData(), name: '   ' }],
])('POST /products rejects invalid product data', async (data) => {
  const service = { create: vi.fn() };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'Invalid product request',
      issues: expect.any(Array),
    });
    expect(service.create).not.toHaveBeenCalled();
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
              headers: {
                Authorization: 'Bearer test-admin-token',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(validProductData()),
            }
          : {}),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Database unavailable' });
      expect(service[operation]).toHaveBeenCalledOnce();
    });
  },
);

test('POST /products rejects users without admin access', async () => {
  const service = { create: vi.fn() };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products`, {
      method: 'POST',
      headers: { Authorization: 'Bearer non-admin-token' },
    });

    expect(response.status).toBe(403);
    expect(service.create).not.toHaveBeenCalled();
  });
});

test('hiding clears all matching baskets without restoring them on show', async () => {
  const product = { productID: 1, ...validProductData(), hide: false };
  let basketEntries = [
    { customerID: 1, productID: 1, quantity: 2 },
    { customerID: 2, productID: 1, quantity: 1 },
    { customerID: 1, productID: 2, quantity: 3 },
  ];
  prisma.product.update.mockImplementation(
    async ({ where, data: updateData }) => {
      const { basketEntries: basketChanges, ...data } = updateData;
      if (basketChanges?.deleteMany) {
        basketEntries = basketEntries.filter(
          (entry) => entry.productID !== where.productID,
        );
      }
      Object.assign(product, data);
      return { ...product };
    },
  );
  prisma.product.findMany.mockImplementation(async ({ where } = {}) => {
    if (where?.hide !== undefined && where.hide !== product.hide) return [];
    if (where?.category !== undefined && where.category !== product.category)
      return [];
    return [{ ...product }];
  });
  const service = new ProductService(new ProductRepository());

  try {
    await withServer(service, async (url) => {
      for (const hide of [true, false]) {
        const update = await fetch(`${url}/products/1`, {
          method: 'PATCH',
          headers: {
            Authorization: 'Bearer admin-token',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ hide }),
        });
        expect(update.status).toBe(200);
        expect(await update.json()).toEqual({ ...product, hide });
        expect(prisma.product.update).toHaveBeenLastCalledWith({
          where: { productID: 1 },
          data: hide ? { hide, basketEntries: { deleteMany: {} } } : { hide },
        });
        expect(basketEntries).toEqual([
          { customerID: 1, productID: 2, quantity: 3 },
        ]);

        for (const path of [
          '/products',
          '/products/category?category=lighting',
        ]) {
          const listing = await fetch(`${url}${path}`);
          expect(listing.status).toBe(200);
          expect(await listing.json()).toEqual(
            hide ? [] : [{ productID: 1, ...validProductData() }],
          );
        }

        const admin = await fetch(`${url}/products/admin`, {
          headers: { Authorization: 'Bearer admin-token' },
        });
        expect(admin.status).toBe(200);
        expect(await admin.json()).toEqual([{ ...product, hide }]);
      }
    });
  } finally {
    prisma.product.update.mockReset();
    prisma.product.findMany.mockReset();
  }
});

test.each(['0', '-1', 'invalid', '1.5'])(
  'PATCH visibility rejects invalid product ID %s',
  async (id) => {
    const service = { update: vi.fn() };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/products/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: 'Bearer admin-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ hide: true }),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid product id',
      });
      expect(service.update).not.toHaveBeenCalled();
    });
  },
);

test('GET /products/admin forwards database failures to Express', async () => {
  const service = {
    findAllForAdmin: vi
      .fn()
      .mockRejectedValue(new Error('Database unavailable')),
  };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/admin`, {
      headers: { Authorization: 'Bearer admin-token' },
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Database unavailable' });
  });
});
