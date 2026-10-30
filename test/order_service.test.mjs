import { expect, test, vi } from 'vitest';

import OrderService from '../src/services/order_service.ts';

test('order service delegates order operations to the repository', async () => {
  const orders = [
    { orderID: 1, customerID: 42, status: 'pending', orderItems: [] },
  ];
  const order = orders[0];
  const repository = {
    findOrdersByCustomerID: vi.fn().mockResolvedValue(orders),
    findOrderByID: vi.fn().mockResolvedValue(order),
    createOrder: vi.fn().mockResolvedValue(order),
    updateOrder: vi.fn().mockResolvedValue(order),
    delete: vi.fn().mockResolvedValue(order),
  };
  const service = new OrderService(repository);

  await expect(service.findOrdersByCustomerID(42)).resolves.toEqual(orders);
  await expect(service.findOrderByID(1, 42)).resolves.toBe(order);
  const createData = {
    customerID: 42,
    status: 'pending',
    type: 'delivery',
    orderItems: [{ productID: 7, quantity: 2 }],
  };
  await expect(service.createOrder(createData)).resolves.toBe(order);
  const updateData = { status: 'processing' };
  await expect(service.updateOrder(1, updateData, 42)).resolves.toBe(order);
  await expect(service.delete(1, 42)).resolves.toBe(order);

  expect(repository.findOrdersByCustomerID).toHaveBeenCalledExactlyOnceWith(42);
  expect(repository.findOrderByID).toHaveBeenCalledExactlyOnceWith(1, 42);
  expect(repository.createOrder).toHaveBeenCalledExactlyOnceWith(createData);
  expect(repository.updateOrder).toHaveBeenCalledExactlyOnceWith(
    1,
    updateData,
    42,
  );
  expect(repository.delete).toHaveBeenCalledExactlyOnceWith(1, 42);
});
