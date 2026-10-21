import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createCustomerRouter } from '../src/controllers/customer_controller.ts';

async function withServer(customerService, run) {
  const app = express();
  app.use(express.json());
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
    id: 1,
    firstName: 'Test',
    lastName: 'Customer',
    email: 'test@example.com',
    password: 'stored-password-hash',
  };
  const service = { findAll: vi.fn().mockResolvedValue([customer]) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers`);

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual([
      {
        id: 1,
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
  const service = { create: vi.fn().mockResolvedValue({ id: 1, ...data }) };

  await withServer(service, async (url) => {
    const response = await fetch(`${url}/customers`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toBe('All okay');
    expect(service.create).toHaveBeenCalledExactlyOnceWith(data);
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
        ...(method === 'POST'
          ? {
              headers: { 'Content-Type': 'application/json' },
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
