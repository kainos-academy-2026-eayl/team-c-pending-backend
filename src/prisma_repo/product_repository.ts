import type { Product } from '../generated/prisma/client';
import prisma from '../prismaClient';

export class ProductRepository {
  // gets visible products for customer browsing
  findMany(): Promise<Product[]> {
    return prisma.product.findMany({ where: { hide: false } });
  }

  findManyForAdmin(): Promise<Product[]> {
    return prisma.product.findMany();
  }

  findByCategory(category: string): Promise<Product[]> {
    return prisma.product.findMany({ where: { category, hide: false } });
  }
  //finds specific products with IDs
  findByID(productID: number): Promise<Product | null> {
    return prisma.product.findUnique({ where: { productID } });
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
    productID: number,
    data: Partial<{
      name: string;
      price: number;
      description: string;
      category: string;
      quantity: number;
      image?: string | null;
      hide: boolean;
    }>,
  ): Promise<Product> {
    return prisma.product.update({
      where: { productID },
      data:
        data.hide === true
          ? { ...data, basketEntries: { deleteMany: {} } }
          : data,
    });
  }
}
