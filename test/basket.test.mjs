import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import basketRouter from '../src/controllers/basket_controller.ts';
import BasketRepository from '../src/prisma_repo/basket_repository.ts';
import BasketService from '../src/services/basket_service.ts';

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
  ['missing quantity', {}],
  ['null quantity', { quantity: null }],
  ['string quantity', { quantity: '3' }],
  ['fractional quantity', { quantity: 1.5 }],
  ['quantity above int32 maximum', { quantity: 2147483648 }],
  ['quantity below int32 minimum', { quantity: -2147483649 }],
])(
  'basket controller rejects an invalid basket request: %s',
  async (_description, body) => {
    const loginService = { getCustomerIdFromToken: vi.fn() };
    const basketService = {
      updateQuantity: vi.fn(),
      getBasket: vi.fn(),
    };

    await withServer(loginService, basketService, async (url) => {
      const response = await fetch(`${url}/basket/42`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: 'Invalid basket request',
        issues: expect.arrayContaining([expect.any(Object)]),
      });
      expect(loginService.getCustomerIdFromToken).not.toHaveBeenCalled();
      expect(basketService.updateQuantity).not.toHaveBeenCalled();
      expect(basketService.getBasket).not.toHaveBeenCalled();
    });
  },
);

test.each([
  ['non-numeric', 'not-a-number'],
  ['unsafe integer', '9007199254740992'],
  ['zero', '0'],
  ['negative', '-1'],
  ['fractional', '1.5'],
  ['above int32 maximum', '2147483648'],
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

test('basket controller returns the authenticated customer basket', async () => {
  const loginService = {
    getCustomerIdFromToken: vi.fn().mockResolvedValue(7),
  };
  const basket = [{ productId: 42, quantity: 3 }];
  const basketService = { getBasket: vi.fn().mockResolvedValue(basket) };

  await withServer(loginService, basketService, async (url) => {
    const response = await fetch(`${url}/basket`, {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(basket);
    expect(loginService.getCustomerIdFromToken).toHaveBeenCalledExactlyOnceWith(
      'valid-token',
    );
    expect(basketService.getBasket).toHaveBeenCalledExactlyOnceWith(7);
  });
});

test.each([
  [undefined, 'A ****** is required'],
  ['Basic credentials', 'A ****** is required'],
  ['Bearer expired-token', 'Invalid or expired token'],
])(
  'basket controller rejects GET /basket with authorization %s',
  async (authorization) => {
    const loginService = {
      getCustomerIdFromToken: vi.fn().mockResolvedValue(undefined),
    };
    const basketService = { getBasket: vi.fn() };

    await withServer(loginService, basketService, async (url) => {
      const response = await fetch(`${url}/basket`, {
        headers: authorization ? { Authorization: authorization } : {},
      });

      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: expect.any(String),
      });
      if (authorization?.startsWith('Bearer ')) {
        expect(
          loginService.getCustomerIdFromToken,
        ).toHaveBeenCalledExactlyOnceWith('expired-token');
      } else {
        expect(loginService.getCustomerIdFromToken).not.toHaveBeenCalled();
      }
      expect(basketService.getBasket).not.toHaveBeenCalled();
    });
  },
);

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

test('basket repository retrieves entries with their product and omits customer ID', async () => {
  const entries = [{ productId: 42, quantity: 3 }];
  const prisma = {
    basketEntry: {
      findMany: vi.fn().mockResolvedValue(entries),
    },
  };
  const repository = new BasketRepository(prisma);

  await expect(repository.getBasket(7)).resolves.toBe(entries);
  expect(prisma.basketEntry.findMany).toHaveBeenCalledExactlyOnceWith({
    where: { customerId: 7 },
    include: { product: true },
    omit: { customerId: true },
  });
});

test('basket service delegates quantity updates and basket reads', async () => {
  const entry = { customerId: 7, productId: 42, quantity: 3 };
  const basket = [entry];
  const repository = {
    updateQuantity: vi.fn().mockResolvedValue(entry),
    getBasket: vi.fn().mockResolvedValue(basket),
  };
  const service = new BasketService(repository);

  await expect(service.updateQuantity(7, 42, 3)).resolves.toBe(entry);
  await expect(service.getBasket(7)).resolves.toBe(basket);
  expect(repository.updateQuantity).toHaveBeenCalledExactlyOnceWith(7, 42, 3);
  expect(repository.getBasket).toHaveBeenCalledExactlyOnceWith(7);
});
