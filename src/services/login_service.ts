import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CustomerRepository } from '../prisma_repo/customer_repository';
import type BasketService from './basket_service';

export class LoginService {
  constructor(
    private customerRepository: CustomerRepository,
    private jwtSecret: string,
  ) {}

  async getCustomerDetailsFromToken(
    token: string,
    basketService: BasketService,
  ): Promise<{
    firstName: string;
    lastName: string;
    email: string;
    customerId: number;
    basketCount: number;
  } | null> {
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

    let basketCount = 0;
    for (const entry of await basketService.getBasket(customerId)) {
      basketCount += entry.quantity;
    }

    return {
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      customerId: customerId,
      basketCount: basketCount,
    };
  }

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

    return this.issueToken(customer.id);
  }
  issueToken(customerId: number | string): string {
    return jwt.sign({}, this.jwtSecret, {
      algorithm: 'HS256',
      subject: String(customerId),
      expiresIn: '1h',
    });
  }

  async getCustomerIdFromToken(token: string) {
    let payload: string | jwt.JwtPayload;
    //catching the token errors in case of any issues
    try {
      payload = jwt.verify(token, this.jwtSecret, { algorithms: ['HS256'] });
    } catch (error) {
      if (error instanceof jwt.JsonWebTokenError) {
        return null;
      }
      throw error;
    }
    //seeing if the recieved ID is actually valid :)
    if (
      typeof payload === 'string' ||
      typeof payload.sub !== 'string' ||
      !/^[1-9]\d*$/.test(payload.sub)
    ) {
      return null;
    }
    // changing the ID into a proper number we can search with
    const customerId = Number(payload.sub);
    if (!Number.isSafeInteger(customerId)) {
      return null;
    }
    return customerId;
  }
}
