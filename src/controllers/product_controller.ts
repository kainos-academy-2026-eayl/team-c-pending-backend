import { type Request, type Response, Router } from 'express';
import type { Product } from '../generated/prisma/browser';
import prisma from '../prismaClient';

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
    const products = await this.productService.findByCategory(
      req.query.category as string,
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
  async create(req: Request, res: Response): Promise<void> {
    const { name, price, description, category, quantity, image } = req.body;
    const _product = await this.productService.create({
      name,
      price,
      description,
      category,
      quantity,
      image,
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

  return router;
}
