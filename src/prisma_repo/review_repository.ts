import type { Review } from '../generated/prisma/client';
import prisma from '../prismaClient';

export default class ReviewRepository {
  findByProductID(productID: number) {
    return prisma.review.findMany({
      where: { productID },
      include: {
        customer: true,
      },
    });
  }

  create(review: Review) {
    const { customerID, productID, rating, comment } = review;
    return prisma.review.upsert({
      where: {
        customerID_productID: { customerID, productID },
      },
      create: review,
      update: { rating, comment },
    });
  }
}
