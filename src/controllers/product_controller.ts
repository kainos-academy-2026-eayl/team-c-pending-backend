import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { Product } from '../generated/prisma/browser';
import prisma from '../prismaClient';

const categoryQuerySchema = z.object({
  category: z.string().trim().min(1),
});

const productIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const createProductSchema = z.object({
  name: z.string().trim().min(1),
  price: z.number().nonnegative(),
  description: z.string().trim().min(1),
  category: z.string().trim().min(1),
  quantity: z.number().int().nonnegative(),
  image: z.string().nullable().optional(),
});

interface ProductService {
  findAll(): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  create(
    data: Pick<
      Product,
      'name' | 'price' | 'description' | 'category' | 'quantity' | 'image'
    >,
  ): Promise<Product>;
}

// this basically creates a controller for product projects and what a product as a class should look like
export class ProductController {
  constructor(private productService: ProductService) {}

  async getCategories(res: Response): Promise<void> {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
    });
    res.json(categories.map((c) => c.category));
  }

  async getAll(res: Response): Promise<void> {
    const products = await this.productService.findAll();
    res.json(
      products.map(
        ({ id, name, price, description, category, quantity, image }) => ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          image,
        }),
      ),
    );
  }
  async getByCategory(req: Request, res: Response): Promise<void> {
    const result = categoryQuerySchema.safeParse(req.query);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid category query',
        issues: result.error.issues,
      });
      return;
    }

    const products = await this.productService.findByCategory(
      result.data.category,
    );
    res.json(
      products.map(
        ({ id, name, price, description, category, quantity, image }) => ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          image,
        }),
      ),
    );
  }

  async getIsInStock(req: Request, res: Response): Promise<void> {
    const result = productIdParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid product id',
        issues: result.error.issues,
      });
      return;
    }

    const id = result.data.id;
    const product = await this.findById(id);
    const stockAmount = product ? product.quantity : 0;
    res.json({ inStock: stockAmount > 0 });
  }

  async create(req: Request, res: Response): Promise<void> {
    const result = createProductSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid product request',
        issues: result.error.issues,
      });
      return;
    }

    const { name, price, description, category, quantity, image } = result.data;
    const _product = await this.productService.create({
      name,
      price,
      description,
      category,
      quantity,
      image: image ?? null,
    });
    res.json('All okay');
  }
  findById(id: number): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { id },
    });
  }
}

export function createProductRouter(productService: ProductService): Router {
  const router = Router();
  const controller = new ProductController(productService);

  router.get('/', (_req, res) => controller.getAll(res));
  router.get('/category', (req, res) => controller.getByCategory(req, res));
  router.get('/categories', (_req, res) => controller.getCategories(res));
  router.post('/', (req, res) => controller.create(req, res));
  router.get('/:id/in-stock', (req, res) => controller.getIsInStock(req, res));

  return router;
}
