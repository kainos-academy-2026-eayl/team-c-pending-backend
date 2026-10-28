import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { Product } from '../generated/prisma/browser';
import prisma from '../prismaClient';

const categoryQuerySchema = z.object({
  category: z.string().trim().min(1),
});

const productIdParamsSchema = z.object({
  productID: z.coerce.number().int().positive(),
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

  async getProductCategories(res: Response): Promise<void> {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
    });
    res.json(categories.map((c) => c.category));
  }

  async getAllProducts(res: Response): Promise<void> {
    const products = await this.productService.findAll();
    res.json(
      products.map(
        ({
          productID,
          name,
          price,
          description,
          category,
          quantity,
          image,
        }) => ({
          productID,
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
  async getByProductCategory(req: Request, res: Response): Promise<void> {
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
        ({
          productID,
          name,
          price,
          description,
          category,
          quantity,
          image,
        }) => ({
          productID,
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

    const product = await this.findByProductId(result.data.productID);
    const stockAmount = product ? product.quantity : 0;
    res.json({ inStock: stockAmount > 0 });
  }

  async createProduct(req: Request, res: Response): Promise<void> {
    const result = createProductSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid product request',
        issues: result.error.issues,
      });
      return;
    }

    const { name, price, description, category, quantity, image } = result.data;
    await this.productService.create({
      name,
      price,
      description,
      category,
      quantity,
      image: image ?? null,
    });
    res.json('All okay');
  }
  findByProductId(productID: number): Promise<Product | null> {
    return prisma.product.findUnique({
      where: { productID },
    });
  }
}

export function createProductRouter(productService: ProductService): Router {
  const router = Router();
  const controller = new ProductController(productService);

  router.get('/', (_req, res) => controller.getAllProducts(res));
  router.get('/category', (req, res) =>
    controller.getByProductCategory(req, res),
  );
  router.get('/categories', (_req, res) =>
    controller.getProductCategories(res),
  );
  router.post('/', (req, res) => controller.createProduct(req, res));
  router.get('/:productID/in-stock', (req, res) =>
    controller.getIsInStock(req, res),
  );

  return router;
}
