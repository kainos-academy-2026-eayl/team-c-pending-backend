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
        return prisma.review.create({
            data: review,
        });
    }
}
