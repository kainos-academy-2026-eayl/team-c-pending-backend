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

test('registration creates a customer and returns an access token', async () => {
  const customerService = {
    create: vi.fn().mockResolvedValue({
      id: 1,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
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
        password: 'submitted-password',
      }),
    });

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      id: 1,
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
    expect(customerService.create).toHaveBeenCalledExactlyOnceWith({
      firstName: 'Test',
      lastName: 'Customer',
      email: 'test@example.com',
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
        password: 'submitted-password',
      }),
    });

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'An account with this email already exists',
    });
  });
});
