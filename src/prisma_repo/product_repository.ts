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
  findByID(productID: number) {
    return prisma.product.findUnique({
      where: { productID },
      include: {
        reviews: {
          include: {
            customer: {
              select: { customerID: true, firstName: true, lastName: true },
            },
          },
        },
      },
    });
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
      image?: string;
    }>,
    // hashes passsword being updated
  ): Promise<Product> {
    return prisma.product.update({ where: { productID }, data });
  }
  // deletes product from database
  delete(productID: number): Promise<Product> {
    return prisma.product.delete({ where: { productID } });
  }

  async getProductCategories() {
    const categories = await prisma.product.findMany({
      distinct: ['category'],
      select: { category: true },
    });
    return categories.map((c) => c.category);
  }
}
