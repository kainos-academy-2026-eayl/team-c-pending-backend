/*
  Warnings:

  - You are about to drop the column `firstname` on the `Customer` table. All the data in the column will be lost.
  - You are about to drop the column `lastname` on the `Customer` table. All the data in the column will be lost.
  - Added the required column `firstName` to the `Customer` table without a default value. This is not possible if the table is not empty.
  - Added the required column `lastName` to the `Customer` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Customer" DROP COLUMN "firstname",
DROP COLUMN "lastname",
ADD COLUMN     "firstName" TEXT NOT NULL,
ADD COLUMN     "lastName" TEXT NOT NULL;

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
