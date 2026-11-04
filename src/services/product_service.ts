import type { Product } from '../generated/prisma/client';
import type { ProductRepository } from '../prisma_repo/product_repository.ts';

export class ProductService {
  constructor(private productRepository: ProductRepository) {}

  findAll(): Promise<Product[]> {
    return this.productRepository.findMany();
  }

  findBestSellers(): Promise<Product[]> {
    return this.productRepository.findBestSellers();
  }

  findAllForAdmin(): Promise<Product[]> {
    return this.productRepository.findManyForAdmin();
  }

  findByID(productID: number): Promise<Product | null> {
    return this.productRepository.findByID(productID);
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

  update(
    productID: number,
    data: Partial<
      Pick<
        Product,
        | 'name'
        | 'price'
        | 'description'
        | 'category'
        | 'quantity'
        | 'image'
        | 'hide'
      >
    >,
  ): Promise<Product> {
    return this.productRepository.update(productID, data);
  }

  async getProductCategories(): Promise<string[]> {
    return this.productRepository.getProductCategories();
  }
}
