import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CustomerRepository } from '../prisma_repo/customer_repository';

export class LoginService {
  constructor(
    private customerRepository: CustomerRepository,
    private jwtSecret: string,
  ) {}

  async getCustomerNameFromToken(
    token: string,
  ): Promise<{ firstName: string; lastName: string } | null> {
    let payload: string | jwt.JwtPayload;

    try {
      payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }
      throw error;
    }

    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub)
    ) {
      return null;
    }

    const customerId = Number(payload.sub);
    if (!Number.isSafeInteger(customerId)) {
      return null;
    }

    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      return null;
    }

    return { firstName: customer.firstName, lastName: customer.lastName };
  }

  async login(email: string, password: string): Promise<string | null> {
    const customer = await this.customerRepository.findByEmail(email);

    if (!customer) {
      return null;
    }

    const passwordMatches = await compare(password, customer.password);

    if (!passwordMatches) {
      return null;
    }

    return this.issueToken(customer.customerID);
  }
  issueToken(customerId: number | string): string {
    return jwt.sign({}, this.jwtSecret, {
      algorithm: 'HS256',
      subject: String(customerId),
      expiresIn: '1h',
    });
  }
}
