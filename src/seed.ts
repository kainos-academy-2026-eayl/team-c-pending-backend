import 'dotenv/config';
import prisma from './prismaClient';

try {
  const customer = await prisma.customer.findFirst({
    orderBy: { customerID: 'asc' },
    select: { customerID: true },
  });
  const products = await prisma.product.findMany({
    orderBy: { productID: 'asc' },
    take: 2,
    select: { productID: true, price: true },
  });
  const [firstProduct, secondProduct] = products;

  if (!customer || !firstProduct || !secondProduct) {
    throw new Error(
      'Order seed requires at least one existing customer and two existing products.',
    );
  }

  const orders = await prisma.$transaction([
    prisma.order.create({
      data: {
        customerID: customer.customerID,
        status: 'pending',
        date: new Date('2026-10-27T10:00:00Z'),
        type: 'delivery',
        orderItems: {
          create: [
            {
              productID: firstProduct.productID,
              quantity: 2,
              unitPrice: firstProduct.price,
            },
            {
              productID: secondProduct.productID,
              quantity: 1,
              unitPrice: secondProduct.price,
            },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        customerID: customer.customerID,
        status: 'processing',
        date: new Date('2026-10-26T14:30:00Z'),
        type: 'collection',
        orderItems: {
          create: [
            {
              productID: secondProduct.productID,
              quantity: 3,
              unitPrice: secondProduct.price,
            },
          ],
        },
      },
    }),
    prisma.order.create({
      data: {
        customerID: customer.customerID,
        status: 'completed',
        date: new Date('2026-10-24T09:15:00Z'),
        type: 'delivery',
        orderItems: {
          create: [
            {
              productID: firstProduct.productID,
              quantity: 1,
              unitPrice: firstProduct.price,
            },
          ],
        },
      },
    }),
  ]);

  console.log(
    'Created 3 sample orders and 4 order items. Order IDs:',
    orders.map((order) => order.orderID),
  );
} catch (error) {
  console.error('Order seed failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
