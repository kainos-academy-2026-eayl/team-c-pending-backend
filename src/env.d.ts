import type BasketService from './services/basket_service';
import type { CustomerService } from './services/customer_service';
import type { LoginService } from './services/login_service';
import type { ProductService } from './services/product_service';

declare global {
  namespace Express {
    interface Locals {
      loginService: LoginService;
      customerService: CustomerService;
      productService: ProductService;
      basketService: BasketService;
    }
  }
}
