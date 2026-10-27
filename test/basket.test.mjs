import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import basketRouter from '../src/controllers/basket_controller.ts';
import BasketRepository from '../src/prisma_repo/basket_repository.ts';

async function withServer(loginService, basketService, run) {
  const app = express();
  app.use(express.json());
  app.locals.loginService = loginService;
  app.locals.basketService = basketService;
  app.use('/basket', basketRouter);
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

test('basket controller updates quantity for the authenticated customer', async () => {
  const loginService = {
    getCustomerIdFromToken: vi.fn().mockResolvedValue(7),
  };
  const basketService = {
    updateQuantity: vi.fn().mockResolvedValue({}),
    getBasket: vi.fn().mockResolvedValue([]),
  };

  await withServer(loginService, basketService, async (url) => {
    const response = await fetch(`${url}/basket/42`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer valid-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity: 3 }),
    });

    expect(response.status).toBe(200);
    expect(loginService.getCustomerIdFromToken).toHaveBeenCalledExactlyOnceWith(
      'valid-token',
    );
    expect(basketService.updateQuantity).toHaveBeenCalledExactlyOnceWith(
      7,
      42,
      3,
    );
  });
});

test.each([
  ['non-numeric', 'not-a-number'],
  ['unsafe integer', '9007199254740992'],
])(
  'basket controller rejects a %s product ID',
  async (_description, productId) => {
    const loginService = { getCustomerIdFromToken: vi.fn() };
    const basketService = { updateQuantity: vi.fn() };

    await withServer(loginService, basketService, async (url) => {
      const response = await fetch(`${url}/basket/${productId}`, {
        method: 'POST',
        headers: {
          Authorization: 'Bearer valid-token',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity: 3 }),
      });

      expect(response.status).toBe(400);
      expect(loginService.getCustomerIdFromToken).not.toHaveBeenCalled();
      expect(basketService.updateQuantity).not.toHaveBeenCalled();
    });
  },
);

test('basket controller rejects requests without a bearer token', async () => {
  const loginService = { getCustomerIdFromToken: vi.fn() };
  const basketService = { updateQuantity: vi.fn() };

  await withServer(loginService, basketService, async (url) => {
    const response = await fetch(`${url}/basket/42`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: 3 }),
    });

    expect(response.status).toBe(401);
    expect(loginService.getCustomerIdFromToken).not.toHaveBeenCalled();
    expect(basketService.updateQuantity).not.toHaveBeenCalled();
  });
});

test('basket controller rejects an invalid bearer token', async () => {
  const loginService = {
    getCustomerIdFromToken: vi.fn().mockResolvedValue(undefined),
  };
  const basketService = { updateQuantity: vi.fn() };

  await withServer(loginService, basketService, async (url) => {
    const response = await fetch(`${url}/basket/42`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer expired-token',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ quantity: 3 }),
    });

    expect(response.status).toBe(401);
    expect(loginService.getCustomerIdFromToken).toHaveBeenCalledExactlyOnceWith(
      'expired-token',
    );
    expect(basketService.updateQuantity).not.toHaveBeenCalled();
  });
});

test('basket repository upserts a positive quantity', async () => {
  const entry = { customerId: 7, productId: 42, quantity: 3 };
  const prisma = {
    basketEntry: {
      delete: vi.fn(),
      upsert: vi.fn().mockResolvedValue(entry),
    },
  };
  const repository = new BasketRepository(prisma);

  await expect(repository.updateQuantity(7, 42, 3)).resolves.toBe(entry);
  expect(prisma.basketEntry.upsert).toHaveBeenCalledExactlyOnceWith({
    where: { customerId_productId: { customerId: 7, productId: 42 } },
    update: { quantity: 3 },
    create: { customerId: 7, productId: 42, quantity: 3 },
  });
  expect(prisma.basketEntry.delete).not.toHaveBeenCalled();
});

test.each([0, -1])(
  'basket repository deletes an entry when quantity is %i',
  async (quantity) => {
    const deletedEntry = { customerId: 7, productId: 42, quantity: 1 };
    const prisma = {
      basketEntry: {
        delete: vi.fn().mockResolvedValue(deletedEntry),
        upsert: vi.fn(),
      },
    };
    const repository = new BasketRepository(prisma);

    await expect(repository.updateQuantity(7, 42, quantity)).resolves.toBe(
      deletedEntry,
    );
    expect(prisma.basketEntry.delete).toHaveBeenCalledExactlyOnceWith({
      where: { customerId_productId: { customerId: 7, productId: 42 } },
    });
    expect(prisma.basketEntry.upsert).not.toHaveBeenCalled();
  },
);
