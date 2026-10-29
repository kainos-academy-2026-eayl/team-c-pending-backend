CREATE TABLE "OrderItem" (
    "orderItemID" SERIAL NOT NULL,
    "orderID" INTEGER NOT NULL,
    "productID" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unitPrice" DOUBLE PRECISION NOT NULL,
    "itemStatus" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "OrderItem_pkey" PRIMARY KEY ("orderItemID")
);

ALTER TABLE "Order" ALTER COLUMN "status" SET DEFAULT 'pending';

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_orderID_fkey" FOREIGN KEY ("orderID") REFERENCES "Order"("orderID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "OrderItem" ADD CONSTRAINT "OrderItem_productID_fkey" FOREIGN KEY ("productID") REFERENCES "Product"("productID") ON DELETE RESTRICT ON UPDATE CASCADE;
