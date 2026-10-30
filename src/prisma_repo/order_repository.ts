import type { Order, Prisma } from '../generated/prisma/client';
import prisma from '../prismaClient';

const orderInclude = {
  orderItems: {
    include: {
      product: true,
    },
  },
} satisfies Prisma.OrderInclude;

export type OrderWithItems = Prisma.OrderGetPayload<{
  include: typeof orderInclude;
}>;

export type OrderItemInput = {
  productID: number;
  quantity: number;
};

export type CreateOrderData = {
  customerID: number;
  status: string;
  type: string;
  orderItems: OrderItemInput[];
};

export type UpdateOrderData = Partial<
  Pick<Order, 'customerID' | 'status' | 'type'>
>;

export class OrderProductsNotFoundError extends Error {
  constructor(readonly productIDs: number[]) {
    super(`Products not found: ${productIDs.join(', ')}`);
    this.name = 'OrderProductsNotFoundError';
  }
}

export class OrderRepository {
  findOrdersByCustomerID(customerID: number): Promise<OrderWithItems[]> {
    return prisma.order.findMany({
      where: { customerID },
      include: orderInclude,
    });
  }

  findOrderByID(
    orderID: number,
    customerID: number,
  ): Promise<OrderWithItems | null> {
    return prisma.order.findUnique({
      where: { orderID, customerID },
      include: orderInclude,
    });
  }

  createOrder(data: CreateOrderData): Promise<OrderWithItems> {
    return prisma.$transaction(async (transaction) => {
      const requestedProductIDs = [
        ...new Set(data.orderItems.map(({ productID }) => productID)),
      ];
      const products =
        requestedProductIDs.length === 0
          ? []
          : await transaction.product.findMany({
              where: { productID: { in: requestedProductIDs } },
              select: { productID: true, price: true },
            });
      const productPrices = new Map(
        products.map(({ productID, price }) => [productID, price]),
      );
      const missingProductIDs = requestedProductIDs.filter(
        (productID) => !productPrices.has(productID),
      );

      if (missingProductIDs.length > 0) {
        throw new OrderProductsNotFoundError(missingProductIDs);
      }

      return transaction.order.create({
        data: {
          customerID: data.customerID,
          status: data.status,
          type: data.type,
          orderItems: {
            create: data.orderItems.map(({ productID, quantity }) => {
              const unitPrice = productPrices.get(productID);
              if (unitPrice === undefined) {
                throw new OrderProductsNotFoundError([productID]);
              }

              return { productID, quantity, unitPrice };
            }),
          },
        },
        include: orderInclude,
      });
    });
  }

  updateOrder(
    orderID: number,
    updateData: UpdateOrderData,
    customerID: number,
  ): Promise<OrderWithItems> {
    return prisma.order.update({
      where: { orderID, customerID },
      data: updateData,
      include: orderInclude,
    });
  }

  delete(orderID: number, customerID: number): Promise<OrderWithItems> {
    return prisma.$transaction(async (transaction) => {
      const order = await transaction.order.findUniqueOrThrow({
        where: { orderID, customerID },
        include: orderInclude,
      });

      await transaction.orderItem.deleteMany({ where: { orderID } });
      await transaction.order.delete({ where: { orderID } });

      return order;
    });
  }
}
