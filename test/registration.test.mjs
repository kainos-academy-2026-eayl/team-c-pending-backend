import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import registrationRouter from '../src/controllers/registration_controller.ts';
import { Prisma } from '../src/generated/prisma/client.ts';

async function withRegistrationServer(customerService, run) {
  const app = express();
  app.use(express.json());
  app.locals.customerService = customerService;
  app.locals.loginService = {
    issueToken: vi.fn().mockReturnValue('signed-token'),
  };
  app.use(registrationRouter);
  const errorHandler = vi.fn((_error, _req, res, _next) => {
    res.status(500).json({ error: 'Internal server error' });
  });
  app.use(errorHandler);
  const server = app.listen(0, '127.0.0.1');

  try {
    await once(server, 'listening');
    await run(`http://127.0.0.1:${server.address().port}`, errorHandler);
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
  }
}

test('registration rejects invalid request bodies', async () => {
  const customerService = { create: vi.fn() };

  await withRegistrationServer(customerService, async (url) => {
    const response = await fetch(`${url}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'invalid',
        role: 'customer',
        password: '',
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'Invalid registration request',
    });
    expect(customerService.create).not.toHaveBeenCalled();
  });
});

test.each([undefined, '', '   '])(
  'registration rejects a missing or blank role: %j',
  async (role) => {
    const customerService = { create: vi.fn() };

    await withRegistrationServer(customerService, async (url) => {
      const response = await fetch(`${url}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com',
          role,
          password: 'submitted-password',
        }),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid registration request',
        issues: expect.arrayContaining([
          expect.objectContaining({ path: ['role'] }),
        ]),
      });
      expect(customerService.create).not.toHaveBeenCalled();
    });
  },
);

test('registration creates a customer and returns an access token', async () => {
  const customerService = {
    create: vi.fn().mockResolvedValue({
      customerID: 1,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      role: 'customer',
      password: 'hashed-password',
    }),
  };

  await withRegistrationServer(customerService, async (url) => {
    const response = await fetch(`${url}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: ' Test ',
        lastName: 'Customer',
        email: 'test@example.com',
        role: ' customer ',
        password: 'submitted-password',
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      customerID: 1,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      role: 'customer',
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    expect(customerService.create).toHaveBeenCalledExactlyOnceWith({
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      role: 'customer',
      password: 'submitted-password',
    });
  });
});

test('registration returns conflict when the email is already registered', async () => {
  const duplicateError = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed',
    {
      code: 'P2002',
      clientVersion: '7.10.1',
      meta: { target: ['email'] },
    },
  );
  const customerService = {
    create: vi.fn().mockRejectedValue(duplicateError),
  };

  await withRegistrationServer(customerService, async (url) => {
    const response = await fetch(`${url}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: 'Test',
        lastName: 'Customer',
        email: 'test@example.com',
        role: 'customer',
        password: 'submitted-password',
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'An account with this email already exists',
    });
  });
});

test.each([
  ['an unexpected error', new Error('Database unavailable')],
  [
    'a non-duplicate Prisma error',
    new Prisma.PrismaClientKnownRequestError('Operation timed out', {
      code: 'P2024',
      clientVersion: '7.10.1',
    }),
  ],
])(
  'registration forwards %s to error handling',
  async (_description, error) => {
    const customerService = {
      create: vi.fn().mockRejectedValue(error),
    };

    await withRegistrationServer(customerService, async (url, errorHandler) => {
      const response = await fetch(`${url}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Test',
          lastName: 'Customer',
          email: 'test@example.com',
          role: 'customer',
          password: 'submitted-password',
        }),
      });

      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({ error: 'Internal server error' });
      expect(errorHandler).toHaveBeenCalledExactlyOnceWith(
        error,
        expect.anything(),
        expect.anything(),
        expect.any(Function),
      );
    });
  },
);
