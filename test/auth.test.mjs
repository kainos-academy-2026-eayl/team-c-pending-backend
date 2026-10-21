import { once } from 'node:events';
import express from 'express';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('bcryptjs', () => ({ compare: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }));

import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRouter from '../src/controllers/login_controller.ts';
import { AuthService } from '../src/services/auth_service.ts';

async function withAuthServer(authService, run) {
  const app = express();
  app.use(express.json());
  app.locals.authService = authService;
  app.use(authRouter);
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

beforeEach(() => {
  vi.clearAllMocks();
});

test('login rejects invalid request bodies', async () => {
  const authService = { login: vi.fn() };

  await withAuthServer(authService, async (url) => {
    const response = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: '' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'Invalid login request',
    });
    expect(authService.login).not.toHaveBeenCalled();
  });
});

test('login rejects invalid credentials', async () => {
  const authService = { login: vi.fn().mockResolvedValue(null) };

  await withAuthServer(authService, async (url) => {
    const response = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'wrong-password',
      }),
    });

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: 'Invalid email or password',
    });
    expect(authService.login).toHaveBeenCalledExactlyOnceWith(
      'user@example.com',
      'wrong-password',
    );
  });
});

test('login returns a bearer token when credentials are valid', async () => {
  const authService = { login: vi.fn().mockResolvedValue('signed-token') };

  await withAuthServer(authService, async (url) => {
    const response = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'user@example.com',
        password: 'correct-password',
      }),
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  });
});

test('authentication returns null when the customer does not exist', async () => {
  const customerRepository = { findByEmail: vi.fn().mockResolvedValue(null) };
  const service = new AuthService(customerRepository, 'secret');

  await expect(
    service.login('user@example.com', 'password'),
  ).resolves.toBeNull();
  expect(customerRepository.findByEmail).toHaveBeenCalledWith(
    'user@example.com',
  );
  expect(compare).not.toHaveBeenCalled();
});

test('authentication returns null when the password does not match', async () => {
  const customerRepository = {
    findByEmail: vi.fn().mockResolvedValue({ id: 1, password: 'stored-hash' }),
  };
  compare.mockResolvedValue(false);
  const service = new AuthService(customerRepository, 'secret');

  await expect(service.login('user@example.com', 'wrong')).resolves.toBeNull();
  expect(compare).toHaveBeenCalledWith('wrong', 'stored-hash');
  expect(jwt.sign).not.toHaveBeenCalled();
});

test('authentication signs a token after the password matches', async () => {
  const customerRepository = {
    findByEmail: vi.fn().mockResolvedValue({ id: 42, password: 'stored-hash' }),
  };
  compare.mockResolvedValue(true);
  jwt.sign.mockReturnValue('signed-token');
  const service = new AuthService(customerRepository, 'secret');

  await expect(service.login('user@example.com', 'correct')).resolves.toBe(
    'signed-token',
  );
  expect(jwt.sign).toHaveBeenCalledWith({}, 'secret', {
    algorithm: 'HS256',
    subject: '42',
    expiresIn: '1h',
  });
});
