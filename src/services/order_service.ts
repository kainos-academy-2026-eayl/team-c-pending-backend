import type {
  CreateOrderData,
  OrderRepository,
  OrderWithItems,
  UpdateOrderData,
} from '../prisma_repo/order_repository.ts';

export { OrderProductsNotFoundError } from '../prisma_repo/order_repository';

export default class OrderService {
  constructor(private orderRepository: OrderRepository) { }

  findOrdersByCustomerID(customerID: number): Promise<OrderWithItems[]> {
    return this.orderRepository.findOrdersByCustomerID(customerID);
  }

  findOrderByID(
    orderID: number,
    customerID: number,
  ): Promise<OrderWithItems | null> {
    return this.orderRepository.findOrderByID(orderID, customerID);
  }

  createOrder(data: CreateOrderData): Promise<OrderWithItems> {
    return this.orderRepository.createOrder(data);
  }

  updateOrder(
    orderID: number,
    updateData: UpdateOrderData,
    customerID: number,
  ): Promise<OrderWithItems> {
    return this.orderRepository.updateOrder(orderID, updateData, customerID);
  }

  delete(orderID: number, customerID: number): Promise<OrderWithItems> {
    return this.orderRepository.delete(orderID, customerID);
  }
}
