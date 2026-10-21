import { Router } from 'express';
import express, { type Express, type Request, type Response } from 'express';
import { z } from 'zod';
import type { AuthService } from '../services/auth_service';

const authRouter = Router();

authRouter.post('/login', async (req: Request, res: Response) => {

  const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
  });
  const result = loginSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'Invalid login request',
      issues: result.error.issues,
    });
    return;
  }

  const authService = req.app.locals.authService as AuthService;
  const token = await authService.login(
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

export default authRouter;
