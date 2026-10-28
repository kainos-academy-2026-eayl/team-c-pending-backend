import type { PrismaClient } from '../generated/prisma/client';

export default class BasketRepository {
  constructor(private prisma: PrismaClient) {}

  async updateQuantity(
    customerID: number,
    productID: number,
    quantity: number,
  ) {
    if (quantity <= 0) {
      return this.prisma.basketEntry.delete({
        where: {
          customerID_productID: {
            customerID,
            productID,
          },
        },
      });
    }

    return this.prisma.basketEntry.upsert({
      where: {
        customerID_productID: {
          customerID,
          productID,
        },
      },
      update: {
        quantity,
      },
      create: {
        customerID,
        productID,
        quantity,
      },
    });
  }

  async getBasket(customerID: number) {
    return this.prisma.basketEntry.findMany({
      where: {
        customerID,
      },
      include: {
        product: true,
      },
      omit: {
        customerID: true,
      },
    });
  }
}
