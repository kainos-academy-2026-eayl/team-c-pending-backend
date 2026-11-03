INSERT INTO "OrderItem" ("orderID", "productID", "quantity", "unitPrice")
SELECT po."OrderID", po."ProductID", po."Quantity", product."price"
FROM "ProductOrder" AS po
JOIN "Product" AS product ON product."productID" = po."ProductID";

DROP TABLE "ProductOrder";