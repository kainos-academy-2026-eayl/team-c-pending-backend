import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';
import type { LoginService } from '../services/login_service';
import type OrderService from '../services/order_service';
import { OrderProductsNotFoundError } from '../services/order_service';

const orderIDParamsSchema = z.object({
  orderID: z.coerce.number().int().positive().max(2147483647),
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

type CustomerResponse = Response<unknown, { customerID: number }>;

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2025'
  );
}

export class OrderController {
  constructor(private orderService: OrderService) {}

  async getAll(res: CustomerResponse): Promise<void> {
    res
      .status(200)
      .json(
        await this.orderService.findOrdersByCustomerID(res.locals.customerID),
      );
  }

  async getByID(req: Request, res: CustomerResponse): Promise<void> {
    const result = orderIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order ID',
        issues: result.error.issues,
      });
      return;
    }

    const order = await this.orderService.findOrderByID(
      result.data.orderID,
      res.locals.customerID,
    );
    if (!order) {
      res.status(404).json({ error: 'Order not found' });
      return;
    }

    res.status(200).json(order);
  }

  async create(req: Request, res: CustomerResponse): Promise<void> {
    const result = createOrderSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order request',
        issues: result.error.issues,
      });
      return;
    }

    try {
      res.status(201).json(
        await this.orderService.createOrder({
          ...result.data,
          customerID: res.locals.customerID,
        }),
      );
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

  async update(req: Request, res: CustomerResponse): Promise<void> {
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
          await this.orderService.updateOrder(
            params.data.orderID,
            result.data,
            res.locals.customerID,
          ),
        );
    } catch (error) {
      if (isRecordNotFound(error)) {
        res.status(404).json({ error: 'Order not found' });
        return;
      }

      throw error;
    }
  }

  async delete(req: Request, res: CustomerResponse): Promise<void> {
    const result = orderIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid order ID',
        issues: result.error.issues,
      });
      return;
    }

    try {
      res
        .status(200)
        .json(
          await this.orderService.delete(
            result.data.orderID,
            res.locals.customerID,
          ),
        );
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

  router.use(async (req, res: CustomerResponse, next) => {
    const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) {
      res.status(401).json({ error: 'A Bearer token is required' });
      return;
    }

    const loginService = req.app.locals.loginService as LoginService;
    const customerID = await loginService.getCustomerIDFromToken(token);
    if (!customerID) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    res.locals.customerID = customerID;
    next();
  });

  router.get('/', (_req, res: CustomerResponse) => controller.getAll(res));
  router.get('/:orderID', (req, res: CustomerResponse) =>
    controller.getByID(req, res),
  );
  router.post('/', (req, res: CustomerResponse) => controller.create(req, res));
  router.patch('/:orderID', (req, res: CustomerResponse) =>
    controller.update(req, res),
  );
  router.delete('/:orderID', (req, res: CustomerResponse) =>
    controller.delete(req, res),
  );

  return router;
}
