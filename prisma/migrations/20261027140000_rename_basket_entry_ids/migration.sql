-- Preserve basket data while aligning foreign-key names with the referenced IDs.
ALTER TABLE "BasketEntry" RENAME COLUMN "customerId" TO "customerID";
ALTER TABLE "BasketEntry" RENAME COLUMN "productId" TO "productID";

ALTER TABLE "BasketEntry" RENAME CONSTRAINT "BasketEntry_customerId_fkey" TO "BasketEntry_customerID_fkey";
ALTER TABLE "BasketEntry" RENAME CONSTRAINT "BasketEntry_productId_fkey" TO "BasketEntry_productID_fkey";
