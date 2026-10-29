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
    select: { productID: true },
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
        productOrders: {
          create: [
            { ProductID: firstProduct.productID, Quantity: 2 },
            { ProductID: secondProduct.productID, Quantity: 1 },
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
        productOrders: {
          create: [{ ProductID: secondProduct.productID, Quantity: 3 }],
        },
      },
    }),
    prisma.order.create({
      data: {
        customerID: customer.customerID,
        status: 'completed',
        date: new Date('2026-10-24T09:15:00Z'),
        type: 'delivery',
        productOrders: {
          create: [{ ProductID: firstProduct.productID, Quantity: 1 }],
        },
      },
    }),
  ]);

  console.log(
    'Created 3 sample orders and 4 product-order entries. Order IDs:',
    orders.map((order) => order.orderID),
  );
} catch (error) {
  console.error('Order seed failed:', error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
