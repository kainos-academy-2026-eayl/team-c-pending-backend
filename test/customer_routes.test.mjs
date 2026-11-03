import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createCustomerRouter } from '../src/controllers/customer_controller.ts';

async function withServer(customerService, run) {
  const app = express();
  app.use(express.json());
  app.locals.loginService = {
    getCustomerDetailsFromToken: vi.fn().mockImplementation(async (token) => {
      if (token === 'non-admin-token') return { role: 'customer' };
      if (token === 'capital-admin-token') return { role: 'Admin' };
      return { role: 'admin' };
    }),
  };
  app.locals.basketService = {};
  app.use('/customers', createCustomerRouter(customerService));
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

test('GET /customers returns only public customer fields', async () => {
  const customer = {
    customerID: 1,
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    password: 'stored-password-hash',
  };
  const service = { findAll: vi.fn().mockResolvedValue([customer]) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers`, {
      headers: { Authorization: 'Bearer test-admin-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        customerID: 1,
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
      },
    ]);
    expect(service.findAll).toHaveBeenCalledOnce();
  });
});

test('POST /customers preserves the existing creation response', async () => {
  const data = {
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    password: 'submitted-password',
  };
  const service = {
    create: vi.fn().mockResolvedValue({ customerID: 1, ...data }),
  };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers`, {
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

test('PATCH /customers/:customerID updates customer details', async () => {
  const changes = {
    firstName: 'Updated',
    lastName: 'Customer',
    email: 'updated@example.com',
  };
  const customer = { customerID: 1, ...changes, role: 'customer' };
  const service = { update: vi.fn().mockResolvedValue(customer) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers/1`, {
      method: 'PATCH',
      headers: {
        Authorization: 'Bearer test-admin-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(changes),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(customer);
    expect(service.update).toHaveBeenCalledExactlyOnceWith(1, changes);
  });
});

test.each([
  ['/customers/not-a-number', { firstName: 'Updated' }],
  ['/customers/1', {}],
])('PATCH %s rejects invalid customer updates', async (path, body) => {
  const service = { update: vi.fn() };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}${path}`, {
      method: 'PATCH',
      headers: {
        Authorization: ['Bearer', 'admin-token'].join(' '),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: expect.stringMatching(/^Invalid customer/),
      issues: expect.any(Array),
    });
    expect(service.update).not.toHaveBeenCalled();
  });
});

test.each(['GET', 'POST'])(
  '%s /customers forwards service failures to Express',
  async (method) => {
    const error = new Error('Database unavailable');
    const service = {
      findAll: vi.fn().mockRejectedValue(error),
      create: vi.fn().mockRejectedValue(error),
    };

    await withServer(service, async (url) => {
      const response = await fetch(`${url}/customers`, {
        method,
        headers: { Authorization: 'Bearer test-admin-token' },
        ...(method === 'POST'
          ? {
              headers: {
                Authorization: 'Bearer test-admin-token',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                firstname: 'Test',
                lastname: 'Customer',
                email: 'test@example.com',
                password: 'submitted-password',
              }),
            }
          : {}),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Database unavailable' });
    });
  },
);

test('GET /customers rejects users without admin access', async () => {
  const service = { findAll: vi.fn() };

  await withServer(service, async (url) => {
    const missingToken = await fetch(`${url}/customers`);
    expect(missingToken.status).toBe(401);

    const customerToken = await fetch(`${url}/customers`, {
      headers: { Authorization: 'Bearer non-admin-token' },
    });
    expect(customerToken.status).toBe(403);
    expect(service.findAll).not.toHaveBeenCalled();
  });
});

test('GET /customers accepts admin roles regardless of capitalization', async () => {
  const service = { findAll: vi.fn().mockResolvedValue([]) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers`, {
      headers: { Authorization: 'Bearer capital-admin-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([]);
    expect(service.findAll).toHaveBeenCalledOnce();
  });
});
