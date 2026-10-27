import type { Product } from '../generated/prisma/client';
import prisma from '../prismaClient';

export class ProductRepository {
  // gets all products from database
  findMany(): Promise<Product[]> {
    return prisma.product.findMany();
  }

  findByCategory(category: string): Promise<Product[]> {
    return prisma.product.findMany({ where: { category } });
  }
  //finds specific products with IDs
  findById(id: number): Promise<Product | null> {
    return prisma.product.findUnique({ where: { id } });
  }
  //finds specific products with categories
  // creates new product in database
  create(data: {
    name: string;
    price: number;
    description: string;
    category: string;
    quantity: number;
    image: string | null;
  }): Promise<Product> {
    return prisma.product.create({ data });
  }

  // updates product in database
  async update(
    id: number,
    data: Partial<{
      name: string;
      price: number;
      description: string;
      category: string;
      quantity: number;
      stock: boolean;
      image?: string;
    }>,
    // hashes passsword being updated
  ): Promise<Product> {
    return prisma.product.update({ where: { id }, data });
  }
  // deletes product from database
  delete(id: number): Promise<Product> {
    return prisma.product.delete({ where: { id } });
  }
}
