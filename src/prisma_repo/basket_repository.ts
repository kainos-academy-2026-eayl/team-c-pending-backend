import type { PrismaClient } from '../generated/prisma/client';

export default class BasketRepository {
  constructor(private prisma: PrismaClient) {}

  async updateQuantity(
    customerId: number,
    productId: number,
    quantity: number,
  ) {
    if (quantity <= 0) {
      return this.prisma.basketEntry.delete({
        where: {
          customerId_productId: {
            customerId,
            productId,
          },
        },
      });
    }

    return this.prisma.basketEntry.upsert({
      where: {
        customerId_productId: {
          customerId,
          productId,
        },
      },
      update: {
        quantity,
      },
      create: {
        customerId,
        productId,
        quantity,
      },
    });
  }

  async getBasket(customerId: number) {
    return this.prisma.basketEntry.findMany({
      where: {
        customerId,
      },
      include: {
        product: true,
      },
      omit: {
        customerId: true,
      },
    });
  }
}
