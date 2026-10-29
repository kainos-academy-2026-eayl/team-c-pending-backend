-- CreateTable
CREATE TABLE "BasketEntry" (
    "customerId" INTEGER NOT NULL,
    "productId" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "BasketEntry_pkey" PRIMARY KEY ("customerId","productId")
);

-- AddForeignKey
ALTER TABLE "BasketEntry" ADD CONSTRAINT "BasketEntry_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BasketEntry" ADD CONSTRAINT "BasketEntry_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
