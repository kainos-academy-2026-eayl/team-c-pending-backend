-- Rename columns rather than recreating them to preserve existing IDs and references.
ALTER TABLE "Customer" RENAME COLUMN "id" TO "customerID";
ALTER TABLE "Product" RENAME COLUMN "id" TO "productID";

CREATE TABLE "Order" (
    "orderID" SERIAL NOT NULL,
    "customerID" INTEGER NOT NULL,
    "status" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "type" TEXT NOT NULL,

    CONSTRAINT "Order_pkey" PRIMARY KEY ("orderID")
);

CREATE TABLE "ProductOrder" (
    "ProductID" INTEGER NOT NULL,
    "OrderID" INTEGER NOT NULL,
    "Quantity" INTEGER NOT NULL,

    CONSTRAINT "ProductOrder_pkey" PRIMARY KEY ("ProductID","OrderID")
);

ALTER TABLE "Order" ADD CONSTRAINT "Order_customerID_fkey" FOREIGN KEY ("customerID") REFERENCES "Customer"("customerID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_ProductID_fkey" FOREIGN KEY ("ProductID") REFERENCES "Product"("productID") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProductOrder" ADD CONSTRAINT "ProductOrder_OrderID_fkey" FOREIGN KEY ("OrderID") REFERENCES "Order"("orderID") ON DELETE RESTRICT ON UPDATE CASCADE;
