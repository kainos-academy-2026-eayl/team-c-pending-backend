import { once } from 'node:events';
import 'dotenv/config';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createProductRouter } from '../src/controllers/product_controller.ts';

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

async function withServer(productService, run, locals = {}) {
  const app = express();
  app.use(express.json());
  Object.assign(app.locals, locals);
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
  const service = {
    getProductCategories: vi.fn().mockResolvedValue(['lighting', 'kitchen']),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/categories`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(['lighting', 'kitchen']);
    expect(service.getProductCategories).toHaveBeenCalledOnce();
  });
});

test.each([
  [{ productID: 7, quantity: 3 }, true],
  [{ productID: 7, quantity: 0 }, false],
  [null, false],
])(
  'GET /products/7/in-stock returns %s for the product lookup',
  async (product, inStock) => {
    const service = { findByID: vi.fn().mockResolvedValue(product) };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}/products/7/in-stock`);

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ inStock });
      expect(service.findByID).toHaveBeenCalledExactlyOnceWith(7);
    });
  },
);

test.each(['/products/not-a-number/in-stock', '/products/0/in-stock'])(
  'GET %s rejects an invalid product ID',
  async (path) => {
    const service = { findByID: vi.fn() };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid product id',
        issues: expect.any(Array),
      });
      expect(service.findByID).not.toHaveBeenCalled();
    });
  },
);

test('GET /products/:productID returns the matching product', async () => {
  const product = { productID: 7, name: 'Desk lamp' };
  const service = { findByID: vi.fn().mockResolvedValue(product) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/7`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(product);
    expect(service.findByID).toHaveBeenCalledExactlyOnceWith(7);
  });
});

test('GET /products/:productID returns 404 when the product does not exist', async () => {
  const service = { findByID: vi.fn().mockResolvedValue(null) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/products/7`);

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'Product not found' });
  });
});

test.each(['/products/not-a-number', '/products/0', '/products/1.5'])(
  'GET %s rejects an invalid product ID',
  async (path) => {
    const service = { findByID: vi.fn() };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`);

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid product id',
        issues: expect.any(Array),
      });
      expect(service.findByID).not.toHaveBeenCalled();
    });
  },
);

test.each([undefined, 'Basic token'])(
  'POST /products/7/reviews rejects Authorization %s',
  async (authorization) => {
    const getCustomerIDFromToken = vi.fn();

    await withServer(
      {},
      async (url) => {
        const response = await fetch(`${url}/products/7/reviews`, {
          method: 'POST',
          ...(authorization
            ? { headers: { Authorization: authorization } }
            : {}),
        });

        expect(response.status).toBe(401);
        expect(await response.json()).toMatchObject({
          error: expect.any(String),
        });
        expect(getCustomerIDFromToken).not.toHaveBeenCalled();
      },
      { loginService: { getCustomerIDFromToken } },
    );
  },
);

test('POST /products/7/reviews rejects an invalid or expired token', async () => {
  const getCustomerIDFromToken = vi.fn().mockResolvedValue(null);

  await withServer(
    {},
    async (url) => {
      const response = await fetch(`${url}/products/7/reviews`, {
        method: 'POST',
        headers: { Authorization: 'Bearer expired' },
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'Invalid or expired token',
      });
      expect(getCustomerIDFromToken).toHaveBeenCalledExactlyOnceWith('expired');
    },
    { loginService: { getCustomerIDFromToken } },
  );
});

test.each([[{ rating: 0 }], [{ rating: 6 }], [{ rating: 5, message: 123 }]])(
  'POST /products/7/reviews rejects invalid review data %j',
  async (body) => {
    const getCustomerIDFromToken = vi.fn().mockResolvedValue(12);
    const create = vi.fn();

    await withServer(
      {},
      async (url) => {
        const response = await fetch(`${url}/products/7/reviews`, {
          method: 'POST',
          headers: {
            Authorization: 'Bearer valid',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        expect(response.status).toBe(400);
        expect(await response.json()).toMatchObject({
          error: 'Invalid review request',
          issues: expect.any(Array),
        });
        expect(create).not.toHaveBeenCalled();
      },
      {
        loginService: { getCustomerIDFromToken },
        reviewService: { create },
      },
    );
  },
);

test('POST /products/7/reviews creates a review with its message', async () => {
  const getCustomerIDFromToken = vi.fn().mockResolvedValue(12);
  const create = vi.fn().mockResolvedValue({});

  await withServer(
    {},
    async (url) => {
      const response = await fetch(`${url}/products/7/reviews`, {
        method: 'POST',
        headers: {
          Authorization: 'bEaReR valid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: 4, message: 'Great lamp' }),
      });

      expect(response.status).toBe(200);
      expect(await response.text()).toBe('');
      expect(getCustomerIDFromToken).toHaveBeenCalledExactlyOnceWith('valid');
      expect(create).toHaveBeenCalledExactlyOnceWith({
        productID: 7,
        customerID: 12,
        rating: 4,
        comment: 'Great lamp',
      });
    },
    {
      loginService: { getCustomerIDFromToken },
      reviewService: { create },
    },
  );
});

test('POST /products/7/reviews defaults an omitted message to null', async () => {
  const create = vi.fn().mockResolvedValue({});

  await withServer(
    {},
    async (url) => {
      const response = await fetch(`${url}/products/7/reviews`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating: 5 }),
      });

      expect(response.status).toBe(200);
      expect(create).toHaveBeenCalledExactlyOnceWith({
        productID: 7,
        customerID: 12,
        rating: 5,
        comment: null,
      });
    },
    {
      loginService: { getCustomerIDFromToken: vi.fn().mockResolvedValue(12) },
      reviewService: { create },
    },
  );
});

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
      headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(200);
    expect(service.create).toHaveBeenCalledExactlyOnceWith({
      ...data,
      image: null,
    });
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
      headers: { 'Content-Type': 'application/json' },
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
              headers: { 'Content-Type': 'application/json' },
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
