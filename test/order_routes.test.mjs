import { once } from 'node:events';
import express from 'express';
import { expect, test, vi } from 'vitest';
import { createOrderRouter } from '../src/controllers/order_controller.ts';
import { Prisma } from '../src/generated/prisma/client.ts';
import { OrderProductsNotFoundError } from '../src/services/order_service.ts';

async function withServer(orderService, run) {
  const app = express();
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
    const allResponse = await fetch(`${url}/orders`);
    expect(allResponse.status).toBe(200);
    expect(await allResponse.json()).toEqual([order]);

    const customerResponse = await fetch(`${url}/orders/customer/42`);
    expect(customerResponse.status).toBe(200);
    expect(await customerResponse.json()).toEqual([order]);

    const byIDResponse = await fetch(`${url}/orders/1`);
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(createData),
    });
    expect(createResponse.status).toBe(201);
    expect(await createResponse.json()).toEqual(order);
    expect(orderService.createOrder).toHaveBeenCalledExactlyOnceWith(
      createData,
    );

    const updateData = { status: 'processing' };
    const updateResponse = await fetch(`${url}/orders/1`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
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
    );

    const deleteResponse = await fetch(`${url}/orders/1`, { method: 'DELETE' });
    expect(deleteResponse.status).toBe(200);
    expect(await deleteResponse.json()).toEqual(order);
    expect(orderService.delete).toHaveBeenCalledExactlyOnceWith(1);
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
    const missingResponse = await fetch(`${url}/orders/1`);
    expect(missingResponse.status).toBe(404);
    expect(await missingResponse.json()).toEqual({ error: 'Order not found' });

    const invalidResponse = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerID: 0,
        status: '',
        type: 'delivery',
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
      headers: { 'Content-Type': 'application/json' },
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
      const response = await fetch(`${url}${path}`, { method });
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
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'collection' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(order);
    expect(service.updateOrder).toHaveBeenCalledExactlyOnceWith(1, {
      type: 'collection',
    });
  });
});

test('POST preserves orders without items and defaults to an empty item list', async () => {
  const order = { orderID: 1, orderItems: [] };
  const service = { createOrder: vi.fn().mockResolvedValue(order) };
  await withServer(service, async (url) => {
    const response = await fetch(`${url}/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        customerID: 42,
        status: 'pending',
        type: 'delivery',
      }),
    });
    expect(response.status).toBe(201);
    expect(await response.json()).toEqual(order);
    expect(service.createOrder).toHaveBeenCalledExactlyOnceWith({
      customerID: 42,
      status: 'pending',
      type: 'delivery',
      orderItems: [],
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
        headers: { 'Content-Type': 'application/json' },
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
        headers: { 'Content-Type': 'application/json' },
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
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'processing' }),
    });
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'Constraint failed' });
  });
});
