import { once } from 'node:events';
import express from 'express';
import jwt from 'jsonwebtoken';
import { expect, test, vi } from 'vitest';
import loginRouter from '../src/controllers/login_controller.ts';
import BasketService from '../src/services/basket_service.ts';
import { LoginService } from '../src/services/login_service.ts';

const secret = 'test-only-secret';

async function withServer(repository, run) {
  const app = express();
  app.locals.loginService = new LoginService(repository, secret);
  app.locals.basketService = new BasketService({
    getBasket(_) {
      return [
        {
          product: {
            name: 'Apple',
            id: 0,
            quantity: 1,
            price: 1,
            description: '',
            category: '',
            image: null,
          },
          productId: 0,
          quantity: 1,
        },
      ];
    },
  });
  app.use(loginRouter);
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
// Tests that token is recieved and it returns the customer's first and last name
test('GET /me verifies the token and returns only the customer details', async () => {
  const repository = {
    // finding customer
    findByID: vi.fn().mockResolvedValue({
      customerID: 42,
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
      password: 'private-hash',
    }),
  };

  // creates return token
  const token = jwt.sign({}, secret, { subject: '42', expiresIn: '1h' });

  await withServer(repository, async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      firstName: 'Alex',
      lastName: 'Smith',
      email: 'alex@example.com',
      basketCount: 1,
      customerId: 42,
    });
    expect(repository.findByID).toHaveBeenCalledExactlyOnceWith(42);
  });
});

test.each([undefined, 'Basic credentials', 'Bearer', 'Bearer one two'])(
  'GET /me rejects a missing or malformed Bearer header: %s',
  async (authorization) => {
    const repository = { findByID: vi.fn() };
    await withServer(repository, async (url) => {
      const response = await fetch(`${url}/me`, {
        headers: authorization ? { Authorization: authorization } : {},
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'A Bearer token is required',
      });
      expect(repository.findByID).not.toHaveBeenCalled();
    });
  },
);

test.each([
  ['malformed', 'not-a-jwt'],
  ['wrong signature', jwt.sign({}, 'wrong-secret', { subject: '42' })],
  ['expired', jwt.sign({}, secret, { subject: '42', expiresIn: -1 })],
  ['not active', jwt.sign({}, secret, { subject: '42', notBefore: '1h' })],
  [
    'wrong algorithm',
    jwt.sign({}, secret, { subject: '42', algorithm: 'HS384' }),
  ],
  ['missing subject', jwt.sign({}, secret)],
  ['string payload', jwt.sign('not-an-object', secret)],
  ...['abc', '0', '-1', '1.5', '1e2', '9007199254740992'].map((subject) => [
    `invalid subject ${subject}`,
    jwt.sign({}, secret, { subject }),
  ]),
])('GET /me rejects a token with %s', async (_description, token) => {
  const repository = { findByID: vi.fn() };
  await withServer(repository, async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired token',
    });
    expect(repository.findByID).not.toHaveBeenCalled();
  });
});

test('GET /me rejects a token for a deleted customer', async () => {
  const repository = { findByID: vi.fn().mockResolvedValue(null) };
  const token = jwt.sign({}, secret, { subject: '42' });
  await withServer(repository, async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired token',
    });
    expect(repository.findByID).toHaveBeenCalledWith(42);
  });
});

test('unexpected JWT verification errors are not treated as invalid credentials', async () => {
  const error = new Error('Unexpected verification failure');
  const repository = { findByID: vi.fn() };
  const service = new LoginService(repository, secret);
  const verify = vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
    throw error;
  });

  try {
    await expect(service.getCustomerDetailsFromToken('token')).rejects.toBe(
      error,
    );
    expect(repository.findByID).not.toHaveBeenCalled();
  } finally {
    verify.mockRestore();
  }
});

test('database errors are not treated as invalid credentials', async () => {
  const error = new Error('Database unavailable');
  const repository = { findByID: vi.fn().mockRejectedValue(error) };
  const service = new LoginService(repository, secret);
  const token = jwt.sign({}, secret, { subject: '42' });

  await expect(service.getCustomerDetailsFromToken(token)).rejects.toBe(error);
});

test('getCustomerIDFromToken returns the numeric ID from a valid token', async () => {
  const service = new LoginService({}, secret);
  const token = jwt.sign({}, secret, { subject: '42' });

  await expect(service.getCustomerIDFromToken(token)).resolves.toBe(42);
});

test.each([
  ['string payload', jwt.sign('not-an-object', secret)],
  ['missing subject', jwt.sign({}, secret)],
  ['invalid subject', jwt.sign({}, secret, { subject: '0' })],
  ['unsafe subject', jwt.sign({}, secret, { subject: '9007199254740992' })],
  ['invalid token', 'not-a-jwt'],
])('getCustomerIDFromToken rejects a %s', async (_description, token) => {
  const service = new LoginService({}, secret);

  await expect(service.getCustomerIDFromToken(token)).resolves.toBeNull();
});

test('unexpected verification failures are not treated as invalid tokens', async () => {
  const error = new Error('Unexpected verification failure');
  const service = new LoginService({}, secret);
  const verify = vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
    throw error;
  });

  try {
    await expect(service.getCustomerIDFromToken('token')).rejects.toBe(error);
  } finally {
    verify.mockRestore();
  }
});
