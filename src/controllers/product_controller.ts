import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import type { ProductService } from '../services/product_service';

const categoryQuerySchema = z.object({
  category: z.string().trim().min(1),
});

const productIDParamsSchema = z.object({
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

const createReviewSchema = z.object({
  message: z.string().optional(),
  rating: z.number().int().min(1).max(5),
});

// this basically creates a controller for product projects and what a product as a class should look like
export class ProductController {
  constructor(private productService: ProductService) {}

  async getBestSellers(res: Response): Promise<void> {
    res.json(await this.productService.findBestSellers());
  }

  async getProductByID(req: Request, res: Response): Promise<void> {
    const result = productIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid product id',
        issues: result.error.issues,
      });
      return;
    }

    const product = await this.productService.findByID(result.data.productID);
    if (!product) {
      res.status(404).json({ error: 'Product not found' });
      return;
    }

    res.json(product);
  }

  async getProductCategories(res: Response): Promise<void> {
    res.json(await this.productService.getProductCategories());
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
    const result = productIDParamsSchema.safeParse(req.params);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid product id',
        issues: result.error.issues,
      });
      return;
    }

    const product = await this.productService.findByID(result.data.productID);
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
  async createReview(req: Request, res: Response): Promise<void> {
    const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
    if (!token) {
      res.status(401).json({ error: 'A Bearer token is required' });
      return;
    }

    const customerID =
      await res.app.locals.loginService.getCustomerIDFromToken(token);
    if (!customerID) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    const result = createReviewSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({
        error: 'Invalid review request',
        issues: result.error.issues,
      });
      return;
    }

    const { rating, message } = result.data;
    await res.app.locals.reviewService.create({
      productID: parseInt(req.params.productID as string, 10),
      customerID,
      rating,
      comment: message ?? null,
    });
    res.status(200).send();
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
  router.get('/best-sellers', (_req, res) => controller.getBestSellers(res));
  router.post('/', (req, res) => controller.createProduct(req, res));
  router.get('/:productID/in-stock', (req, res) =>
    controller.getIsInStock(req, res),
  );
  router.get('/:productID', (req, res) => controller.getProductByID(req, res));
  router.post('/:productID/reviews', (req, res) =>
    controller.createReview(req, res),
  );

  return router;
}
