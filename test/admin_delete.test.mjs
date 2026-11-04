import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createCustomerRouter } from '../src/controllers/customer_controller.ts';
import { createProductRouter } from '../src/controllers/product_controller.ts';
import { Prisma } from '../src/generated/prisma/client.ts';
import { CustomerService } from '../src/services/customer_service.ts';

async function withServer(run) {
  const service = { delete: vi.fn().mockResolvedValue({}) };
  const app = express();
  app.locals.loginService = {
    getCustomerDetailsFromToken: async (token) =>
      token === 'expired'
        ? null
        : { role: token === 'customer' ? 'customer' : 'Admin' },
  };
  app.locals.basketService = {};
  app.use('/customers', createCustomerRouter(service));
  app.use('/products', createProductRouter(service));
  app.use((error, _req, res, _next) => {
    res.status(500).json({ error: error.message });
  });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    await run(`http://127.0.0.1:${server.address().port}`, service);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

for (const section of ['customers']) {
  test(`DELETE /${section}/:id succeeds for admins`, async () => {
    await withServer(async (url, service) => {
      const response = await fetch(`${url}/${section}/3`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin' },
      });
      expect(response.status).toBe(204);
      expect(await response.text()).toBe('');
      expect(service.delete).toHaveBeenCalledExactlyOnceWith(3);
    });
  });

  test.each([
    [undefined, 401],
    ['expired', 401],
    ['customer', 403],
  ])(`DELETE /${section}/:id rejects token %s`, async (token, status) => {
    await withServer(async (url, service) => {
      const response = await fetch(`${url}/${section}/3`, {
        method: 'DELETE',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      expect(response.status).toBe(status);
      expect(service.delete).not.toHaveBeenCalled();
    });
  });

  test.each(['0', '-1', 'invalid', '1.5'])(
    `DELETE /${section}/:id rejects invalid ID %s`,
    async (id) => {
      await withServer(async (url, service) => {
        const response = await fetch(`${url}/${section}/${id}`, {
          method: 'DELETE',
          headers: { Authorization: 'Bearer admin' },
        });
        expect(response.status).toBe(400);
        expect(service.delete).not.toHaveBeenCalled();
      });
    },
  );

  test.each([
    ['P2025', 404],
    ['P2003', 409],
    ['P1001', 500],
  ])(`DELETE /${section}/:id handles %s`, async (code, status) => {
    await withServer(async (url, service) => {
      service.delete.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError('Database failure', {
          code,
          clientVersion: '7.10.1',
        }),
      );
      const response = await fetch(`${url}/${section}/3`, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer admin' },
      });
      expect(response.status).toBe(status);
      expect((await response.json()).error).toBeTruthy();
    });
  });

  test(`DELETE /${section}/:id forwards unexpected failures`, async () => {
    await withServer(async (url, service) => {
      service.delete.mockRejectedValue(new Error('Database failure'));
      const response = await fetch(`${url}/${section}/3`, {
        method: 'DELETE',
        headers: { Authorization: ['Bearer', 'admin-token'].join(' ') },
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Database failure' });
    });
  });
}

test('customer service delegates deletion to its repository', async () => {
  const repository = { delete: vi.fn().mockResolvedValue({}) };
  await expect(new CustomerService(repository).delete(3)).resolves.toEqual({});
  expect(repository.delete).toHaveBeenCalledExactlyOnceWith(3);
});

test.each([
  ['admin', 405],
  [undefined, 401],
  ['expired', 401],
  ['customer', 403],
])('product deletion is disabled for token %s', async (token, status) => {
  await withServer(async (url, service) => {
    const response = await fetch(`${url}/products/3`, {
      method: 'DELETE',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    expect(response.status).toBe(status);
    expect(service.delete).not.toHaveBeenCalled();
    if (status === 405) {
      expect(response.headers.get('Allow')).toBe('PATCH');
      expect((await response.json()).error).toContain(
        'Products cannot be deleted',
      );
    }
  });
});
