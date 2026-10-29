import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createOrderRouter } from '../src/controllers/order_controller.ts';
import { Prisma } from '../src/generated/prisma/client.ts';
import {
  OrderBasketEmptyError,
  OrderInsufficientStockError,
  OrderProductsNotFoundError,
} from '../src/services/order_service.ts';

const authenticatedHeaders = {
  'Content-Type': 'application/json',
  Authorization: 'Bearer test-token',
};

async function withServer(
  orderService,
  run,
  loginService = { getCustomerIDFromToken: vi.fn().mockResolvedValue(42) },
) {
  const app = express();
  app.locals.loginService = loginService;
  app.use(express.json());
  app.use('/orders', createOrderRouter(orderService));
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

test('order routes expose CRUD operations through the service', async () => {
  const order = {
    orderID: 1,
    customerID: 42,
    status: 'pending',
    type: 'delivery',
    orderItems: [],
  };
  const orderService = {
    findManyOrders: vi.fn().mockResolvedValue([order]),
    findOrdersByCustomerID: vi.fn().mockResolvedValue([order]),
    findOrderByID: vi.fn().mockResolvedValue(order),
    createOrder: vi.fn().mockResolvedValue(order),
    updateOrder: vi.fn().mockResolvedValue({ ...order, status: 'processing' }),
    delete: vi.fn().mockResolvedValue(order),
  };

  await withServer(orderService, async (url) => {
    const allResponse = await fetch(`${url}/orders`, {
      headers: authenticatedHeaders,
    });
    expect(allResponse.status).toBe(200);
    expect(await allResponse.json()).toEqual([order]);

    const customerResponse = await fetch(`${url}/orders/customer/42`, {
      headers: authenticatedHeaders,
    });
    expect(customerResponse.status).toBe(200);
    expect(await customerResponse.json()).toEqual([order]);

    const byIDResponse = await fetch(`${url}/orders/1`, {
      headers: authenticatedHeaders,
    });
    expect(byIDResponse.status).toBe(200);
    expect(await byIDResponse.json()).toEqual(order);

    const createData = {
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: [{ productID: 7, quantity: 2 }],
    };
    const createResponse = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify(createData),
    });
    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toEqual(order);
    expect(orderService.createOrder).toHaveBeenCalledExactlyOnceWith({
      customerID: 42,
      type: 'delivery',
    });

    const updateData = { status: 'processing' };
    const updateResponse = await fetch(`${url}/orders/1`, {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify(updateData),
    });
    expect(updateResponse.status).toBe(200);
    expect(await updateResponse.json()).toEqual({
      ...order,
      status: 'processing',
    });
    expect(orderService.updateOrder).toHaveBeenCalledExactlyOnceWith(
      1,
      updateData,
      42,
    );

    const deleteResponse = await fetch(`${url}/orders/1`, {
      method: 'DELETE',
      headers: authenticatedHeaders,
    });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual(order);
    expect(orderService.delete).toHaveBeenCalledExactlyOnceWith(1, 42);
    expect(orderService.findOrderByID).toHaveBeenCalledExactlyOnceWith(1, 42);
    expect(orderService.findOrdersByCustomerID).toHaveBeenCalledTimes(2);
    expect(orderService.findOrdersByCustomerID).toHaveBeenCalledWith(42);
    expect(orderService.findManyOrders).not.toHaveBeenCalled();
  });
});

test('order routes validate input and return 404 for missing orders', async () => {
  const orderService = {
    findManyOrders: vi.fn(),
    findOrdersByCustomerID: vi.fn(),
    findOrderByID: vi.fn().mockResolvedValue(null),
    createOrder: vi.fn(),
    updateOrder: vi.fn(),
    delete: vi.fn(),
  };

  await withServer(orderService, async (url) => {
    const missingResponse = await fetch(`${url}/orders/1`, {
      headers: authenticatedHeaders,
    });
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: 'Order not found' });

    const invalidResponse = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        customerID: 0,
        status: '',
        type: '',
        orderItems: [{ productID: 0, quantity: -2 }],
      }),
    });
    expect(invalidResponse.status).toBe(400);
    expect(await invalidResponse.json()).toMatchObject({
      error: 'Invalid order request',
    });
    expect(orderService.createOrder).not.toHaveBeenCalled();
  });
});

test.each(
  ['GET', 'POST', 'PATCH', 'DELETE'].flatMap((method) =>
    [undefined, 'Basic credentials', 'Bearer', 'Bearer one two'].map(
      (authorization) => [method, authorization],
    ),
  ),
)(
  '%s rejects missing or malformed authorization %s',
  async (method, authorization) => {
    const service = { createOrder: vi.fn() };
    const loginService = { getCustomerIDFromToken: vi.fn() };
    await withServer(
      service,
      async (url) => {
        const response = await fetch(`${url}/orders`, {
          method,
          headers: authorization ? { Authorization: authorization } : {},
        });
        expect(response.status).toBe(401);
        expect(await response.json()).toEqual({
          error: 'A Bearer token is required',
        });
        expect(loginService.getCustomerIDFromToken).not.toHaveBeenCalled();
        expect(service.createOrder).not.toHaveBeenCalled();
      },
      loginService,
    );
  },
);

test('POST rejects invalid or expired tokens before creating an order', async () => {
  const service = { createOrder: vi.fn() };
  const loginService = {
    getCustomerIDFromToken: vi.fn().mockResolvedValue(null),
  };
  await withServer(
    service,
    async (url) => {
      const response = await fetch(`${url}/orders`, {
        method: 'POST',
        headers: authenticatedHeaders,
      });
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({
        error: 'Invalid or expired token',
      });
      expect(
        loginService.getCustomerIDFromToken,
      ).toHaveBeenCalledExactlyOnceWith('test-token');
      expect(service.createOrder).not.toHaveBeenCalled();
    },
    loginService,
  );
});

test('POST rejects an empty basket', async () => {
  const service = {
    createOrder: vi.fn().mockRejectedValue(new OrderBasketEmptyError()),
  };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ status: 'pending', type: 'delivery' }),
    });
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: 'Basket is empty' });
  });
});

test('order route returns a conflict for insufficient stock', async () => {
  const service = {
    createOrder: vi
      .fn()
      .mockRejectedValue(new OrderInsufficientStockError([7])),
  };
  const data = {
    customerID: 42,
    status: 'pending',
    type: 'delivery',
    orderItems: [{ productID: 7, quantity: 3 }],
  };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify(data),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Insufficient stock',
      productIDs: [7],
    });
    expect(service.createOrder).toHaveBeenCalledExactlyOnceWith({
      customerID: 42,
      type: 'delivery',
    });
  });
});

test('order route rejects items referring to unknown products', async () => {
  const orderService = {
    findManyOrders: vi.fn(),
    findOrdersByCustomerID: vi.fn(),
    findOrderByID: vi.fn(),
    createOrder: vi
      .fn()
      .mockRejectedValue(new OrderProductsNotFoundError([99])),
    updateOrder: vi.fn(),
    delete: vi.fn(),
  };

  await withServer(orderService, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        customerID: 42,
        status: 'pending',
        type: 'delivery',
        orderItems: [{ productID: 99, quantity: 1 }],
      }),
    });

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: 'Order contains unknown products',
      productIDs: [99],
    });
  });
});

test.each([
  [
    'GET',
    '/orders/customer/0',
    'findOrdersByCustomerID',
    'Invalid customer ID',
  ],
  ['GET', '/orders/invalid', 'findOrderByID', 'Invalid order ID'],
  ['PATCH', '/orders/2147483648', 'updateOrder', 'Invalid order ID'],
  ['DELETE', '/orders/-1', 'delete', 'Invalid order ID'],
])(
  '%s %s rejects invalid IDs without calling the service',
  async (method, path, operation, error) => {
    const service = { [operation]: vi.fn() };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: authenticatedHeaders,
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error,
        issues: expect.any(Array),
      });
      expect(service[operation]).not.toHaveBeenCalled();
    });
  },
);

test.each([{}, { status: '' }, { type: ' ' }, { status: 1 }])(
  'PATCH rejects invalid update body %j',
  async (body) => {
    const service = { updateOrder: vi.fn() };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/orders/1`, {
        method: 'PATCH',
        headers: authenticatedHeaders,
        body: JSON.stringify(body),
      });
      expect(response.status).toBe(400);
      expect(await response.json()).toMatchObject({
        error: 'Invalid order request',
        issues: expect.any(Array),
      });
      expect(service.updateOrder).not.toHaveBeenCalled();
    });
  },
);

test('PATCH supports updating only the order type', async () => {
  const order = { orderID: 1, type: 'collection', orderItems: [] };
  const service = { updateOrder: vi.fn().mockResolvedValue(order) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders/1`, {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ type: 'collection' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(order);
    expect(service.updateOrder).toHaveBeenCalledExactlyOnceWith(
      1,
      {
        type: 'collection',
      },
      42,
    );
  });
});

test('POST uses token identity and ignores client-supplied items and customerID', async () => {
  const order = { orderID: 1, orderItems: [] };
  const service = { createOrder: vi.fn().mockResolvedValue(order) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({
        customerID: 99,
        orderItems: [{ productID: 999, quantity: 100 }],
        status: 'completed',
        type: 'delivery',
      }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(order);
    expect(service.createOrder).toHaveBeenCalledExactlyOnceWith({
      customerID: 42,
      type: 'delivery',
    });
  });
});

test.each([
  ['PATCH', 'updateOrder'],
  ['DELETE', 'delete'],
])(
  '%s returns 404 when Prisma cannot find the order',
  async (method, operation) => {
    const error = new Prisma.PrismaClientKnownRequestError('Record not found', {
      code: 'P2025',
      clientVersion: '7.10.1',
    });
    const service = { [operation]: vi.fn().mockRejectedValue(error) };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/orders/1`, {
        method,
        headers: authenticatedHeaders,
        body: JSON.stringify({ status: 'processing' }),
      });
      expect(response.status).toBe(404);
      expect(await response.json()).toEqual({ error: 'Order not found' });
    });
  },
);

test.each([
  ['POST', '/orders', 'createOrder'],
  ['PATCH', '/orders/1', 'updateOrder'],
  ['DELETE', '/orders/1', 'delete'],
])(
  '%s forwards unexpected service errors to Express',
  async (method, path, operation) => {
    const service = {
      [operation]: vi.fn().mockRejectedValue(new Error('Database unavailable')),
    };
    await withServer(service, async (url) => {
      const response = await fetch(`${url}${path}`, {
        method,
        headers: authenticatedHeaders,
        body: JSON.stringify({
          customerID: 42,
          status: 'pending',
          type: 'delivery',
        }),
      });
      expect(response.status).toBe(500);
      expect(await response.json()).toEqual({
        error: 'Database unavailable',
      });
    });
  },
);

test('PATCH does not treat other Prisma errors as missing orders', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('Constraint failed', {
    code: 'P2003',
    clientVersion: '7.10.1',
  });
  const service = { updateOrder: vi.fn().mockRejectedValue(error) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders/1`, {
      method: 'PATCH',
      headers: authenticatedHeaders,
      body: JSON.stringify({ status: 'processing' }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Constraint failed' });
  });
});

test('customers cannot list another customer orders', async () => {
  const service = { findOrdersByCustomerID: vi.fn() };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders/customer/99`, {
      headers: authenticatedHeaders,
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toEqual({
      error: "Cannot access another customer's orders",
    });
    expect(service.findOrdersByCustomerID).not.toHaveBeenCalled();
  });
});

test.each([
  ['GET', 'findOrderByID', null],
  [
    'PATCH',
    'updateOrder',
    new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '7.10.1',
    }),
  ],
  [
    'DELETE',
    'delete',
    new Prisma.PrismaClientKnownRequestError('Not found', {
      code: 'P2025',
      clientVersion: '7.10.1',
    }),
  ],
])(
  '%s scopes order access to the token customer ID',
  async (method, operation, result) => {
    const service = { [operation]: vi.fn() };
    if (result === null) {
      service[operation].mockResolvedValue(null);
    } else {
      service[operation].mockRejectedValue(result);
    }
    await withServer(service, async (url) => {
      const response = await fetch(`${url}/orders/9`, {
        method,
        headers: authenticatedHeaders,
        ...(method === 'PATCH'
          ? { body: JSON.stringify({ type: 'collection', customerID: 99 }) }
          : {}),
      });
      expect(response.status).toBe(404);
      if (method === 'PATCH') {
        expect(service[operation]).toHaveBeenCalledExactlyOnceWith(
          9,
          { type: 'collection' },
          42,
        );
      } else {
        expect(service[operation]).toHaveBeenCalledExactlyOnceWith(9, 42);
      }
    });
  },
);

test('POST returns a retryable conflict for serialization failures', async () => {
  const error = new Prisma.PrismaClientKnownRequestError('Write conflict', {
    code: 'P2034',
    clientVersion: '7.10.1',
  });
  const service = { createOrder: vi.fn().mockRejectedValue(error) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: authenticatedHeaders,
      body: JSON.stringify({ type: 'delivery' }),
    });
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: 'Checkout conflicted with another request; retry checkout',
    });
  });
});
