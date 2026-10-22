import { type Request, type Response, Router } from 'express';
import type { Product } from '../generated/prisma/browser';
import prisma from '../prismaClient';

interface ProductService {
  findAll(): Promise<Product[]>;
  findByCategory(category: string): Promise<Product[]>;
  create(
    data: Pick<
      Product,
      | 'name'
      | 'price'
      | 'description'
      | 'category'
      | 'quantity'
      | 'stock'
      | 'image'
    >,
  ): Promise<Product>;
}

// this basically creates a controller for product projects and what a product as a class should look like
export class ProductController {
  constructor(private productService: ProductService) {}

  async getAll(res: Response): Promise<void> {
    const products = await this.productService.findAll();
    res.json(
      products.map(
        ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          stock,
          image,
        }) => ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          stock,
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
        ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          stock,
          image,
        }) => ({
          id,
          name,
          price,
          description,
          category,
          quantity,
          stock,
          image,
        }),
      ),
    );
  }
  async create(req: Request, res: Response): Promise<void> {
    const { name, price, description, category, quantity, stock, image } =
      req.body;
    const _product = await this.productService.create({
      name,
      price,
      description,
      category,
      quantity,
      stock,
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
  router.post('/', (req, res) => controller.create(req, res));

  return router;
}
