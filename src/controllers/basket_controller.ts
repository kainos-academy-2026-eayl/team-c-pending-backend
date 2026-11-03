import { Router } from 'express';
import z from 'zod';

const router = Router();

router.post('/:productID', async (req, res) => {
  const result = z
    .object({
      quantity: z.int32(),
    })
    .safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'Invalid basket request',
      issues: result.error.issues,
    });
    return;
  }

  const { quantity } = result.data;

  const productID = Number(req.params.productID);
  if (
    !Number.isSafeInteger(productID) ||
    productID < 1 ||
    productID > 2147483647
  ) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const loginService = req.app.locals.loginService;

  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'A Bearer token is required' });
    return;
  }

  const customerID = await loginService.getCustomerIDFromToken(token);
  if (!customerID) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const basketService = await req.app.locals.basketService;
  await basketService.updateQuantity(customerID, productID, quantity);
  res.status(200).json(await basketService.getBasket(customerID));
});

router.get('/', async (req, res) => {
  const loginService = req.app.locals.loginService;

  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'A Bearer token is required' });
    return;
  }

  const customerID = await loginService.getCustomerIDFromToken(token);
  if (!customerID) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const basketService = await req.app.locals.basketService;

  res.status(200).json(await basketService.getBasket(customerID));
});

export default router;
