import type { Product } from '../generated/prisma/client';
import prisma from '../prismaClient';

export class ProductRepository {
  async findBestSellers(): Promise<Product[]> {
    const rankings = await prisma.orderItem.groupBy({
      by: ['productID'],
      where: {
        quantity: { gt: 0 },
        itemStatus: { equals: 'active', mode: 'insensitive' },
        order: {
          status: {
            notIn: ['cancelled', 'canceled', 'refunded'],
            mode: 'insensitive',
          },
        },
      },
      _sum: { quantity: true },
      orderBy: [{ _sum: { quantity: 'desc' } }, { productID: 'asc' }],
      take: 12,
    });

    if (rankings.length === 0) {
      return [];
    }

    const products = await prisma.product.findMany({
      where: { productID: { in: rankings.map(({ productID }) => productID) } },
    });
    const productsByID = new Map(
      products.map((product) => [product.productID, product]),
    );
    return rankings.map(({ productID }) => {
      const product = productsByID.get(productID);
      if (!product) {
        throw new Error(`Ranked product ${productID} no longer exists`);
      }
      return product;
    });
  }

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

  async getProductCategories() {
    const categories = await prisma.product.findMany({
      where: { hide: false },
      distinct: ['category'],
      select: { category: true },
    });
    return categories.map((c) => c.category);
  }
}
