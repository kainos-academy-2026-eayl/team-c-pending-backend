import { type Request, type Response, Router } from 'express';
import { z } from 'zod';

const loginRouter = Router();

loginRouter.get('/me', async (req: Request, res: Response) => {
  const token = req.get('Authorization')?.match(/^Bearer\s+(\S+)$/i)?.[1];
  //no token is passed
  if (!token) {
    res.status(401).json({ error: 'A Bearer token is required' });
    return;
  }

  const loginService = req.app.locals.loginService;
  const basketService = req.app.locals.basketService;
  const customerName = await loginService.getCustomerDetailsFromToken(
    token,
    basketService,
  );
  // no token or expired check
  if (!customerName) {
    res.status(401).json({ error: 'Invalid or expired token' });
    return;
  }

  res.status(200).json(customerName);
});

loginRouter.post('/login', async (req: Request, res: Response) => {
  // validating the login itself
  const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
  });
  const result = loginSchema.safeParse(req.body);
  // if the result has any errors pass back a 400
  if (!result.success) {
    res.status(400).json({
      error: 'Invalid login request',
      issues: result.error.issues,
    });
    return;
  }

  const loginService = req.app.locals.loginService;
  const token = await loginService.login(
    result.data.email,
    result.data.password,
  );

  if (!token) {
    res.status(401).json({
      error: 'Invalid email or password',
    });
    return;
  }

  res.status(200).json({
    accessToken: token,
    tokenType: 'Bearer',
    expiresIn: 3600,
  });
});

export default loginRouter;
