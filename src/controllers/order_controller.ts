import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import type OrderService from '../services/order_service';
import { OrderProductsNotFoundError } from '../services/order_service';

const orderIDParamsSchema = z.object({
  orderID: z.coerce.number().int().positive().max(2147483647),
});

const customerIDParamsSchema = z.object({
  customerID: z.coerce.number().int().positive().max(2147483647),
});

const orderItemSchema = z.object({
  productID: z.number().int().positive().max(2147483647),
  quantity: z.number().int().positive().max(2147483647),
});

const createOrderSchema = z.object({
  customerID: z.number().int().positive().max(2147483647),
  status: z.string().trim().min(1),
  type: z.string().trim().min(1),
  orderItems: z.array(orderItemSchema).default([]),
});

const updateOrderSchema = z
  .object({
    status: z.string().trim().min(1).optional(),
    type: z.string().trim().min(1).optional(),
  })
  .refine((data) => data.status !== undefined || data.type !== undefined);

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAll(res: Response): Promise<void> {
    res.status(200).json(await this.orderService.findManyOrders());
  }

  async getByCustomerID(req: Request, res: Response): Promise<void> {
    const result = customerIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid customer ID',
        issues: result.error.issues,
      });
      return;
    }

    res
      .status(200)
      .json(
        await this.orderService.findOrdersByCustomerID(result.data.customerID),
      );
  }

  async getByID(req: Request, res: Response): Promise<void> {
    const result = orderIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order ID',
        issues: result.error.issues,
      });
      return;
    }

    const order = await this.orderService.findOrderByID(result.data.orderID);
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.status(200).json(order);
  }

  async create(req: Request, res: Response): Promise<void> {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order request',
        issues: result.error.issues,
      });
      return;
    }

    try {
      res.status(201).json(await this.orderService.createOrder(result.data));
    } catch (error) {
      if (error instanceof OrderProductsNotFoundError) {
        res.status(400).json({
          error: 'Order contains unknown products',
          productIDs: error.productIDs,
        });
        return;
      }

      throw error;
    }
  }

  async update(req: Request, res: Response): Promise<void> {
    const params = orderIDParamsSchema.safeParse(req.params);
    if (!params.success) {
      res.status(400).json({
        error: 'Invalid order ID',
        issues: params.error.issues,
      });
      return;
    }

    const result = updateOrderSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order request',
        issues: result.error.issues,
      });
      return;
    }

    try {
      res
        .status(200)
        .json(
          await this.orderService.updateOrder(params.data.orderID, result.data),
        );
    } catch (error) {
      if (isRecordNotFound(error)) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      throw error;
    }
  }

  async delete(req: Request, res: Response): Promise<void> {
    const result = orderIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order ID',
        issues: result.error.issues,
      });
      return;
    }

    try {
      res.status(200).json(await this.orderService.delete(result.data.orderID));
    } catch (error) {
      if (isRecordNotFound(error)) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      throw error;
    }
  }
}

export function createOrderRouter(orderService: OrderService): Router {
  const router = Router();
  const controller = new OrderController(orderService);

  router.get('/', (_req, res) => controller.getAll(res));
  router.get('/customer/:customerID', (req, res) =>
    controller.getByCustomerID(req, res),
  );
  router.get('/:orderID', (req, res) => controller.getByID(req, res));
  router.post('/', (req, res) => controller.create(req, res));
  router.patch('/:orderID', (req, res) => controller.update(req, res));
  router.delete('/:orderID', (req, res) => controller.delete(req, res));

  return router;
}
