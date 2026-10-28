import type { Product } from '../generated/prisma/client';
import type { ProductRepository } from '../prisma_repo/product_repository.ts';

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  findAll(): Promise<Product[]> {
    return this.productRepository.findMany();
  }

  async findById(productID: number): Promise<Product | null> {
    return this.productRepository.findById(productID);
  }

  async findByCategory(category: string): Promise<Product[]> {
    return this.productRepository.findByCategory(category);
  }

  async create(
    data: Pick<
      Product,
      'name' | 'price' | 'description' | 'category' | 'quantity' | 'image'
    >,
  ): Promise<Product> {
    return this.productRepository.create({
      ...data,
    });
  }
}
