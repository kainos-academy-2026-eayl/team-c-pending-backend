import { compare } from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { CustomerRepository } from '../prisma_repo/customer_repository';

export class AuthService {
  constructor(
    private customerRepository: CustomerRepository,
    private jwtSecret: string,
  ) { }
  // Gets the customer's first and last name from the JWT token
  async getCustomerNameFromToken(
    token: string,
  ): Promise<{ firstName: string; lastName: string; } | null> {
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
    // Calling the customer using the findById method 
    const customer = await this.customerRepository.findById(customerId);
    if (!customer) {
      return null;
    }
    // Passing back the customer's first and last name
    return { firstName: customer.firstName, lastName: customer.lastName };
  }
  // Login API with email and password, gives back a token
  async login(email: string, password: string): Promise<string | null> {
    const customer = await (
      this.customerRepository as CustomerRepository & {
        //finds the customer by their email so we can check their password is right
        findByEmail(
          email: string,
        ): Promise<{ id: string | number; password: string; } | null>;
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
