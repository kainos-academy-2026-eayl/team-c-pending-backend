import {
  type Order,
  Prisma,
  type PrismaClient,
} from '../generated/prisma/client';
import prisma from '../prismaClient';

const orderInclude = { orderItems: true } satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export type CreateOrderData = {
  customerID: number;
  type: string;
};

export type UpdateOrderData = Partial<Pick<Order, 'status' | 'type'>>;

export class OrderProductsNotFoundError extends Error {
  constructor(readonly productIDs: number[]) {
    super(`Products not found: ${productIDs.join(', ')}`);
    this.name = 'OrderProductsNotFoundError';
  }
}

export class OrderInsufficientStockError extends Error {
  constructor(readonly productIDs: number[]) {
    super(`Insufficient stock for products: ${productIDs.join(', ')}`);
    this.name = 'OrderInsufficientStockError';
  }
}

export class OrderBasketEmptyError extends Error {
  constructor() {
    super('Basket is empty');
    this.name = 'OrderBasketEmptyError';
  }
}

export class OrderRepository {
  constructor(private client: PrismaClient = prisma) {}

  findOrdersByCustomerID(customerID: number): Promise<OrderWithItems[]> {
    return this.client.order.findMany({
      where: { customerID },
      include: orderInclude,
    });
  }

  findOrderByID(
    orderID: number,
    customerID: number,
  ): Promise<OrderWithItems | null> {
    return this.client.order.findUnique({
      where: { orderID, customerID },
      include: orderInclude,
    });
  }

  createOrder(data: CreateOrderData): Promise<OrderWithItems> {
    return this.client.$transaction(
      async (transaction) => {
        const basketEntries = await transaction.basketEntry.findMany({
          where: { customerID: data.customerID },
          select: { productID: true, quantity: true },
        });
        if (basketEntries.length === 0) {
          throw new OrderBasketEmptyError();
        }

        const requestedProductIDs = [
          ...new Set(basketEntries.map(({ productID }) => productID)),
        ];
        const products = await transaction.product.findMany({
          where: { productID: { in: requestedProductIDs } },
          select: { productID: true, price: true, quantity: true },
        });
        const productsByID = new Map(
          products.map((product) => [product.productID, product]),
        );
        const missingProductIDs = requestedProductIDs.filter(
          (productID) => !productsByID.has(productID),
        );

        if (missingProductIDs.length > 0) {
          throw new OrderProductsNotFoundError(missingProductIDs);
        }

        const requestedQuantities = new Map<number, number>();
        const orderItems = basketEntries.map(({ productID, quantity }) => {
          const product = productsByID.get(productID);
          if (product?.price === undefined) {
            throw new OrderProductsNotFoundError([productID]);
          }

          const totalQuantity =
            (requestedQuantities.get(productID) ?? 0) + quantity;
          requestedQuantities.set(productID, totalQuantity);
          if (totalQuantity > product.quantity) {
            throw new OrderInsufficientStockError([productID]);
          }

          return { productID, quantity, unitPrice: product.price };
        });

        for (const [productID, quantity] of [...requestedQuantities].sort(
          ([firstID], [secondID]) => firstID - secondID,
        )) {
          const result = await transaction.product.updateMany({
            where: { productID, quantity: { gte: quantity } },
            data: { quantity: { decrement: quantity } },
          });
          if (result.count !== 1) {
            throw new OrderInsufficientStockError([productID]);
          }
        }

        const order = await transaction.order.create({
          data: {
            customerID: data.customerID,
            status: 'pending',
            type: data.type,
            orderItems: {
              create: orderItems,
            },
          },
          include: orderInclude,
        });
        await transaction.basketEntry.deleteMany({
          where: { customerID: data.customerID },
        });
        return order;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  }

  updateOrder(
    orderID: number,
    updateData: UpdateOrderData,
    customerID: number,
  ): Promise<OrderWithItems> {
    return this.client.order.update({
      where: { orderID, customerID },
      data: { status: updateData.status, type: updateData.type },
      include: orderInclude,
    });
  }

  delete(orderID: number, customerID: number): Promise<OrderWithItems> {
    return this.client.$transaction(async (transaction) => {
      const order = await transaction.order.findUniqueOrThrow({
        where: { orderID, customerID },
        include: orderInclude,
      });

      await transaction.orderItem.deleteMany({ where: { orderID } });
      await transaction.productOrder.deleteMany({
        where: { OrderID: orderID },
      });
      await transaction.order.delete({ where: { orderID, customerID } });

      return order;
    });
  }
}
