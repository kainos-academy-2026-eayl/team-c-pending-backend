import { type Request, type Response, Router } from 'express';
import { z } from 'zod';
import { Prisma } from '../generated/prisma/client';

const registrationRouter = Router();

const registrationSchema = z.object({
  firstName: z.string().trim().min(1),
  lastName: z.string().trim().min(1),
  email: z.email(),
  password: z
    .string()
    .min(1)
    .refine((password) => Buffer.byteLength(password, 'utf8') <= 72, {
      message: 'Password must be at most 72 UTF-8 bytes',
    }),
});

registrationRouter.post('/register', async (req: Request, res: Response) => {
  const result = registrationSchema.safeParse(req.body);

  if (!result.success) {
    res.status(400).json({
      error: 'Invalid registration request',
      issues: result.error.issues,
    });
    return;
  }

  const customerService = req.app.locals.customerService;
  const loginService = req.app.locals.loginService;

  try {
    const customer = await customerService.create(result.data);

    res.status(201).json({
      customerID: customer.customerID,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      accessToken: loginService.issueToken(customer.customerID),
      tokenType: 'Bearer',
      expiresIn: 3600,
    });
  } catch (error) {
    // The unique email constraint reports duplicates as P2002; expose that as a client conflict.
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === 'P2002'
    ) {
      res.status(409).json({
        error: 'An account with this email already exists',
      });
      return;
    }

    throw error;
  }
});

export default registrationRouter;
