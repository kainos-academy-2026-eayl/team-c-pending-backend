import type { NextFunction, Request, Response } from 'express';

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  if (!token) {
    res.status(401).json({ error: 'A bearer token is required' });
    return;
  }

  const loginService = req.app.locals.loginService;
  const basketService = req.app.locals.basketService;
  const customer = await loginService.getCustomerDetailsFromToken(
    token,
    basketService,
  );

  if (!customer) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  if (customer.role.toLowerCase() !== 'admin') {
    res.status(403).json({ error: 'Admin access is required' });
    return;
  }

  next();
}
