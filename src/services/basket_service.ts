import type BasketRepository from '../prisma_repo/basket_repository';

export default class BasketService {
  constructor(private basketRepository: BasketRepository) {}

  async updateQuantity(
    customerId: number,
    productId: number,
    quantity: number,
  ) {
    return this.basketRepository.updateQuantity(
      customerId,
      productId,
      quantity,
    );
  }

  async getBasket(customerId: number) {
    return this.basketRepository.getBasket(customerId);
  }
}
