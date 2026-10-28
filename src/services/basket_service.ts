import type BasketRepository from '../prisma_repo/basket_repository';

export default class BasketService {
  constructor(private basketRepository: BasketRepository) { }

  async updateQuantity(
    customerID: number,
    productID: number,
    quantity: number,
  ) {
    return this.basketRepository.updateQuantity(
      customerID,
      productID,
      quantity,
    );
  }

  async getBasket(customerID: number) {
    return this.basketRepository.getBasket(customerID);
  }
}
