import { once } from 'node:events';
import express from 'express';
import { beforeEach, expect, test, vi } from 'vitest';

vi.mock('bcryptjs', () => ({ compare: vi.fn() }));
vi.mock('jsonwebtoken', () => ({ default: { sign: vi.fn() } }));

import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import loginRouter from '../src/controllers/login_controller.ts';
import { LoginService } from '../src/services/login_service.ts';

async function withLoginServer(loginService, run) {
  const app = express();
  app.use(express.json());
  app.locals.loginService = loginService;
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

beforeEach(() => {
  vi.clearAllMocks();
});

test('login rejects invalid request bodies', async () => {
  const loginService = { login: vi.fn() };

  await withLoginServer(loginService, async (url) => {
    const response = await fetch(`${url}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'invalid', password: '' }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({
      error: 'Invalid login request',
    });
    expect(loginService.login).not.toHaveBeenCalled();
  });
});

test('login rejects invalid credentials', async () => {
  const loginService = { login: vi.fn().mockResolvedValue(null) };

  await withLoginServer(loginService, async (url) => {
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
    expect(loginService.login).toHaveBeenCalledExactlyOnceWith(
      'user@example.com',
      'wrong-password',
    );
  });
});

test('login returns a bearer token when credentials are valid', async () => {
  const loginService = { login: vi.fn().mockResolvedValue('signed-token') };

  await withLoginServer(loginService, async (url) => {
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

test('login returns null when the customer does not exist', async () => {
  const customerRepository = { findByEmail: vi.fn().mockResolvedValue(null) };
  const service = new LoginService(customerRepository, 'secret');

  await expect(
    service.login('user@example.com', 'password'),
  ).resolves.toBeNull();
  expect(customerRepository.findByEmail).toHaveBeenCalledWith(
    'user@example.com',
  );
  expect(compare).not.toHaveBeenCalled();
});

test('login returns null when the password does not match', async () => {
  const customerRepository = {
    findByEmail: vi
      .fn()
      .mockResolvedValue({ customerID: 1, password: 'stored-hash' }),
  };
  compare.mockResolvedValue(false);
  const service = new LoginService(customerRepository, 'secret');

  await expect(service.login('user@example.com', 'wrong')).resolves.toBeNull();
  expect(compare).toHaveBeenCalledWith('wrong', 'stored-hash');
  expect(jwt.sign).not.toHaveBeenCalled();
});

test('login signs a token after the password matches', async () => {
  const customerRepository = {
    findByEmail: vi
      .fn()
      .mockResolvedValue({ customerID: 42, password: 'stored-hash' }),
  };
  compare.mockResolvedValue(true);
  jwt.sign.mockReturnValue('signed-token');
  const service = new LoginService(customerRepository, 'secret');

  await expect(service.login('user@example.com', 'correct')).resolves.toBe(
    'signed-token',
  );
  expect(jwt.sign).toHaveBeenCalledWith({}, 'secret', {
    algorithm: 'HS256',
    subject: '42',
    expiresIn: '1h',
  });
});
