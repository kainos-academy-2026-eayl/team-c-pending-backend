import type { Review } from '../generated/prisma/client';
import type ReviewRepository from '../prisma_repo/review_repository';

export default class ReviewService {
  constructor(private reviewRepository: ReviewRepository) {}

  findByProductID(productID: number) {
    return this.reviewRepository.findByProductID(productID);
  }

  create(review: Review) {
    return this.reviewRepository.create(review);
  }
}
