import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CustomerRepository } from '../prisma_repo/customer_repository';

export class AuthService {
  constructor(
    private customerRepository: CustomerRepository,
    private jwtSecret: string,
  ) {}

  async login(email: string, password: string): Promise<string | null> {
    const customer = await (
      this.customerRepository as CustomerRepository & {
        findByEmail(
          email: string,
        ): Promise<{ id: string | number; password: string } | null>;
      }
    ).findByEmail(email);

    if (!customer) {
      return null;
    }

    const passwordMatches = await compare(password, customer.password);

    if (!passwordMatches) {
      return null;
    }

    return jwt.sign({}, this.jwtSecret, {
      algorithm: 'HS256',
      subject: String(customer.id),
      expiresIn: '1h',
    });
  }
}
