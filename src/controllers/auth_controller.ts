import type { Request, Response } from "express";
import { z } from "zod";
import type { AuthService } from "../services/auth_service";

const loginSchema = z.object({
    email: z.email(),
    password: z.string().min(1),
});

export class AuthController {
    constructor(private authService: AuthService) { }

    async login(req: Request, res: Response): Promise<void> {
        const result = loginSchema.safeParse(req.body);

        if (!result.success) {
            res.status(400).json({
                error: "Invalid login request",
                issues: result.error.issues,
            });
            return;
        }

        const token = await this.authService.login(
            result.data.email,
            result.data.password,
        );

        if (!token) {
            res.status(401).json({
                error: "Invalid email or password",
            });
            return;
        }

        res.status(200).json({
            accessToken: token,
            tokenType: "Bearer",
            expiresIn: 3600,
        });
    }
}