import { once } from 'node:events';
import express from 'express';
import jwt from 'jsonwebtoken';
import { expect, test, vi } from 'vitest';
import loginRouter from '../src/controllers/login_controller.ts';
import { LoginService } from '../src/services/login_service.ts';

const secret = 'test-only-secret';

async function withServer(repository, run) {
  const app = express();
  app.locals.loginService = new LoginService(repository, secret);
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
test('GET /me verifies the token and returns only the customer name', async () => {
  const repository = {
    // finding customer
    findById: vi.fn().mockResolvedValue({
      id: 42,
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
    });
    expect(repository.findById).toHaveBeenCalledExactlyOnceWith(42);
  });
});

test.each([undefined, 'Basic credentials', 'Bearer', 'Bearer one two'])(
  'GET /me rejects a missing or malformed Bearer header: %s',
  async (authorization) => {
    const repository = { findById: vi.fn() };
    await withServer(repository, async (url) => {
      const response = await fetch(`${url}/me`, {
        headers: authorization ? { Authorization: authorization } : {},
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'A Bearer token is required',
      });
      expect(repository.findById).not.toHaveBeenCalled();
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
  const repository = { findById: vi.fn() };
  await withServer(repository, async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired token',
    });
    expect(repository.findById).not.toHaveBeenCalled();
  });
});

test('GET /me rejects a token for a deleted customer', async () => {
  const repository = { findById: vi.fn().mockResolvedValue(null) };
  const token = jwt.sign({}, secret, { subject: '42' });
  await withServer(repository, async (url) => {
    const response = await fetch(`${url}/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid or expired token',
    });
    expect(repository.findById).toHaveBeenCalledWith(42);
  });
});

test('unexpected JWT verification errors are not treated as invalid credentials', async () => {
  const error = new Error('Unexpected verification failure');
  const repository = { findById: vi.fn() };
  const service = new LoginService(repository, secret);
  const verify = vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
    throw error;
  });

  try {
    await expect(service.getCustomerNameFromToken('token')).rejects.toBe(error);
    expect(repository.findById).not.toHaveBeenCalled();
  } finally {
    verify.mockRestore();
  }
});

test('database errors are not treated as invalid credentials', async () => {
  const error = new Error('Database unavailable');
  const repository = { findById: vi.fn().mockRejectedValue(error) };
  const service = new LoginService(repository, secret);
  const token = jwt.sign({}, secret, { subject: '42' });

  await expect(service.getCustomerNameFromToken(token)).rejects.toBe(error);
});

test('getCustomerIdFromToken returns the numeric ID from a valid token', async () => {
  const service = new LoginService({}, secret);
  const token = jwt.sign({}, secret, { subject: '42' });

  await expect(service.getCustomerIdFromToken(token)).resolves.toBe(42);
});

test.each([
  ['string payload', jwt.sign('not-an-object', secret)],
  ['missing subject', jwt.sign({}, secret)],
  ['invalid subject', jwt.sign({}, secret, { subject: '0' })],
  ['unsafe subject', jwt.sign({}, secret, { subject: '9007199254740992' })],
  ['invalid token', 'not-a-jwt'],
])('getCustomerIdFromToken rejects a %s', async (_description, token) => {
  const service = new LoginService({}, secret);

  await expect(service.getCustomerIdFromToken(token)).resolves.toBeNull();
});

test('unexpected verification failures are not treated as invalid tokens', async () => {
  const error = new Error('Unexpected verification failure');
  const service = new LoginService({}, secret);
  const verify = vi.spyOn(jwt, 'verify').mockImplementationOnce(() => {
    throw error;
  });

  try {
    await expect(service.getCustomerIdFromToken('token')).rejects.toBe(error);
  } finally {
    verify.mockRestore();
  }
});
