import { expect, test, vi } from 'vitest';

const prismaMock = vi.hoisted(() => ({
  review: {
    findMany: vi.fn(),
    upsert: vi.fn(),
  },
}));

vi.mock('../src/prismaClient.ts', () => ({ default: prismaMock }));

import ReviewRepository from '../src/prisma_repo/review_repository.ts';
import ReviewService from '../src/services/review_service.ts';

test('review repository fetches product reviews with their customers', async () => {
  const reviews = [{ reviewID: 1, productID: 7, customer: { customerID: 12 } }];
  prismaMock.review.findMany.mockResolvedValue(reviews);
  const repository = new ReviewRepository();

  await expect(repository.findByProductID(7)).resolves.toBe(reviews);
  expect(prismaMock.review.findMany).toHaveBeenCalledExactlyOnceWith({
    where: { productID: 7 },
    include: { customer: true },
  });
});

test('review repository upserts a review by customer and product', async () => {
  const review = {
    productID: 7,
    customerID: 12,
    rating: 5,
    comment: 'Great lamp',
  };
  prismaMock.review.upsert.mockResolvedValue(review);
  const repository = new ReviewRepository();

  await expect(repository.create(review)).resolves.toBe(review);
  expect(prismaMock.review.upsert).toHaveBeenCalledExactlyOnceWith({
    where: {
      customerID_productID: { customerID: 12, productID: 7 },
    },
    create: review,
    update: { rating: 5, comment: 'Great lamp' },
  });
});

test('review service delegates repository operations', async () => {
  const reviews = [{ reviewID: 1, productID: 7 }];
  const review = {
    productID: 7,
    customerID: 12,
    rating: 5,
    comment: null,
  };
  const repository = {
    findByProductID: vi.fn().mockResolvedValue(reviews),
    create: vi.fn().mockResolvedValue(review),
  };
  const service = new ReviewService(repository);

  await expect(service.findByProductID(7)).resolves.toBe(reviews);
  expect(repository.findByProductID).toHaveBeenCalledExactlyOnceWith(7);
  await expect(service.create(review)).resolves.toBe(review);
  expect(repository.create).toHaveBeenCalledExactlyOnceWith(review);
});
