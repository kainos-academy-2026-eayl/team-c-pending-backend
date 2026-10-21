import { Router } from 'express';
import express, { type Express, type Request, type Response } from 'express';


const router = Router();

router.get('/health', (_req: Request, res: Response) => {
    res.json({ status: 'UP', time: new Date().toISOString() });
});

export default router;





