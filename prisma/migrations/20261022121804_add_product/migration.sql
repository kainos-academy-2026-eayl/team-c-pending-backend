-- AlterTable
ALTER TABLE "Customer" RENAME COLUMN "firstname" TO "firstName";
ALTER TABLE "Customer" RENAME COLUMN "lastname" TO "lastName";

-- CreateTable
CREATE TABLE "Product" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "description" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "stock" BOOLEAN NOT NULL,
    "image" TEXT,

    CONSTRAINT "Product_pkey" PRIMARY KEY ("id")
);
