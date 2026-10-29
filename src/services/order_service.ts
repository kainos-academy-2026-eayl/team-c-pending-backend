import type {
  CreateOrderData,
  OrderRepository,
  OrderWithItems,
  UpdateOrderData,
} from '../prisma_repo/order_repository.ts';

export { OrderProductsNotFoundError } from '../prisma_repo/order_repository';

export default class OrderService {
  constructor(private orderRepository: OrderRepository) {}

  findManyOrders(): Promise<OrderWithItems[]> {
    return this.orderRepository.findManyOrders();
  }

  findOrdersByCustomerID(customerID: number): Promise<OrderWithItems[]> {
    return this.orderRepository.findOrdersByCustomerID(customerID);
  }

  findOrderByID(orderID: number): Promise<OrderWithItems | null> {
    return this.orderRepository.findOrderByID(orderID);
  }

  createOrder(data: CreateOrderData): Promise<OrderWithItems> {
    return this.orderRepository.createOrder(data);
  }

  updateOrder(
    orderID: number,
    updateData: UpdateOrderData,
  ): Promise<OrderWithItems> {
    return this.orderRepository.updateOrder(orderID, updateData);
  }

  delete(orderID: number): Promise<OrderWithItems> {
    return this.orderRepository.delete(orderID);
  }
}
