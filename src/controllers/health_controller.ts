import { type Request, type Response, Router } from 'express';

const router = Router();
// standard health check endpoint 
router.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'UP', time: new Date().toISOString() });
});

export default router;
