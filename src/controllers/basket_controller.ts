import { Router } from 'express';
import z from 'zod';
import type BasketService from '../services/basket_service';
import type { LoginService } from '../services/login_service';

const router = Router();

router.post('/:productId', async (req, res) => {
  const { quantity } = z
    .object({
      quantity: z.number(),
    })
    .parse(req.body);

  const productId = Number(req.params.productId);
  if (
    !Number.isSafeInteger(productId) ||
    productId < 1 ||
    productId > 2147483647
  ) {
    res.status(400).json({ error: 'Invalid product ID' });
    return;
  }

  const loginService = req.app.locals.loginService as LoginService;

  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'A Bearer token is required' });
    return;
  }

  const customerId = await loginService.getCustomerIdFromToken(token);
  if (!customerId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const basketService = (await req.app.locals.basketService) as BasketService;
  await basketService.updateQuantity(customerId, productId, quantity);
  res.status(200).json(await basketService.getBasket(customerId));
});

router.get('/', async (req, res) => {
  const loginService = req.app.locals.loginService as LoginService;

  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'A Bearer token is required' });
    return;
  }

  const customerId = await loginService.getCustomerIdFromToken(token);
  if (!customerId) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  const basketService = (await req.app.locals.basketService) as BasketService;

  res.status(200).json(await basketService.getBasket(customerId));
});

export default router;
