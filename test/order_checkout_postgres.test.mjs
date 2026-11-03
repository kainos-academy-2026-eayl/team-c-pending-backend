import { randomUUID } from 'node:crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  test,
} from 'vitest';
import { PrismaClient } from '../src/generated/prisma/client.ts';
import { OrderRepository } from '../src/prisma_repo/order_repository.ts';

const connectionString = process.env.TEST_DATABASE_URL;

describe.skipIf(!connectionString)('checkout against PostgreSQL', () => {
  let client;
  let repository;
  let customerIDs;
  let productID;

  beforeAll(() => {
    client = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
    repository = new OrderRepository(client);
  });

  afterAll(async () => {
    await client.$disconnect();
  });

  beforeEach(async () => {
    customerIDs = [];
    productID = undefined;
    for (let index = 0; index < 3; index++) {
      const customer = await client.customer.create({
        data: {
          firstName: 'Test',
          lastName: 'Customer',
          email: `${randomUUID()}@example.test`,
          password: 'test-hash',
        },
      });
      customerIDs.push(customer.customerID);
    }
    const product = await client.product.create({
      data: {
        name: 'Apple',
        price: 4.5,
        description: '',
        category: 'Fruit',
        quantity: 2,
      },
    });
    productID = product.productID;
  });

  afterEach(async () => {
    await client.$transaction(async (transaction) => {
      await transaction.orderItem.deleteMany({
        where: { order: { customerID: { in: customerIDs } } },
      });
      await transaction.order.deleteMany({
        where: { customerID: { in: customerIDs } },
      });
      await transaction.basketEntry.deleteMany({
        where: { customerID: { in: customerIDs } },
      });
      if (productID !== undefined) {
        await transaction.product.delete({ where: { productID } });
      }
      await transaction.customer.deleteMany({
        where: { customerID: { in: customerIDs } },
      });
    });
  });

  async function addBasket(customerID) {
    await client.basketEntry.create({
      data: { customerID, productID, quantity: 2 },
    });
  }

  async function expectRolledBack(customerID) {
    expect(
      await client.order.count({
        where: { customerID: { in: customerIDs } },
      }),
    ).toBe(0);
    expect(await client.orderItem.count({ where: { productID } })).toBe(0);
    expect(
      await client.product.findUnique({ where: { productID } }),
    ).toMatchObject({ quantity: 2 });
    expect(
      await client.basketEntry.findMany({ where: { customerID } }),
    ).toMatchObject([{ productID, quantity: 2 }]);
  }

  test('deducts stock and clears only the ordering customer basket', async () => {
    const [customerID, otherCustomerID] = customerIDs;
    await addBasket(customerID);
    await addBasket(otherCustomerID);
    const order = await repository.createOrder({
      customerID,
      type: 'delivery',
      status: 'completed',
    });
    expect(order.status).toBe('pending');
    expect(order.orderItems).toMatchObject([
      { productID, quantity: 2, unitPrice: 4.5 },
    ]);
    expect(
      await client.product.findUnique({ where: { productID } }),
    ).toMatchObject({ quantity: 0 });
    expect(await client.basketEntry.count({ where: { customerID } })).toBe(0);
    expect(
      await client.basketEntry.count({
        where: { customerID: otherCustomerID },
      }),
    ).toBe(1);
  });

  test.each(['order creation', 'basket clearing'])(
    'rolls back stock, orders and basket after %s fails',
    async (failurePoint) => {
      const [customerID] = customerIDs;
      await addBasket(customerID);
      const error = new Error(`Injected ${failurePoint} failure`);
      const failingClient = client.$extends({
        query: {
          order: {
            async create({ args, query }) {
              if (failurePoint === 'order creation') throw error;
              return query(args);
            },
          },
          basketEntry: {
            async deleteMany({ args, query }) {
              if (failurePoint === 'basket clearing') throw error;
              return query(args);
            },
          },
        },
      });

      await expect(
        new OrderRepository(failingClient).createOrder({
          customerID,
          type: 'delivery',
        }),
      ).rejects.toBe(error);
      await expectRolledBack(customerID);
    },
  );

  test.each(['same customer', 'different customers'])(
    'competing checkout for %s cannot oversell',
    async (scenario) => {
      const [customerID, otherCustomerID] = customerIDs;
      const secondCustomerID =
        scenario === 'same customer' ? customerID : otherCustomerID;
      await addBasket(customerID);
      if (secondCustomerID !== customerID) await addBasket(secondCustomerID);
      const results = await Promise.allSettled([
        repository.createOrder({ customerID, type: 'delivery' }),
        repository.createOrder({
          customerID: secondCustomerID,
          type: 'delivery',
        }),
      ]);
      expect(
        results.filter(({ status }) => status === 'fulfilled'),
      ).toHaveLength(1);
      expect(
        results.filter(({ status }) => status === 'rejected'),
      ).toHaveLength(1);
      expect(
        await client.order.count({
          where: { customerID: { in: customerIDs } },
        }),
      ).toBe(1);
      expect(await client.orderItem.count({ where: { productID } })).toBe(1);
      expect(
        await client.product.findUnique({ where: { productID } }),
      ).toMatchObject({ quantity: 0 });
      expect(
        await client.basketEntry.count({
          where: { customerID: { in: customerIDs } },
        }),
      ).toBe(secondCustomerID === customerID ? 0 : 1);
    },
  );
});
