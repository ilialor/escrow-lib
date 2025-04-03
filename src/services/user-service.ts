import { Decimal } from 'decimal.js';
import { IUserService } from '../interfaces/services';
import { IUser, IOrder } from '../interfaces/base';
import { User, Customer, Contractor, PlatformAdmin } from '../models/user';
import { UserType } from '../utils/constants';

/**
 * Service for managing users
 */
export class UserService implements IUserService {
  private users: Map<string, IUser>;
  private orderService: any; // Will be set via setOrderService method
  
  constructor() {
    this.users = new Map<string, IUser>();
  }
  
  /**
   * Set order service instance for cross-service communication
   * @param orderService OrderService instance
   */
  setOrderService(orderService: any): void {
    this.orderService = orderService;
  }

  /**
   * Create a new user
   * @param name User name
   * @param userType Type of user to create
   * @returns Created user
   */
  async createUser(name: string, userType: UserType): Promise<IUser> {
    let user: IUser;
    
    switch (userType) {
      case UserType.CUSTOMER:
        user = new Customer(name);
        break;
      case UserType.CONTRACTOR:
        user = new Contractor(name);
        break;
      case UserType.PLATFORM:
        user = new PlatformAdmin(name);
        break;
      default:
        throw new Error(`Invalid user type: ${userType}`);
    }
    
    this.users.set(user.id, user);
    return user;
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User instance
   */
  async getUser(userId: string): Promise<IUser> {
    const user = this.users.get(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    return user;
  }

  /**
   * Add funds to user's balance
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns New balance
   */
  async deposit(userId: string, amount: Decimal): Promise<Decimal> {
    const user = await this.getUser(userId);
    
    if (amount.isNegative() || amount.isZero()) {
      throw new Error('Deposit amount must be positive');
    }
    
    user.updateBalance(amount);
    return user.getBalance();
  }

  /**
   * Withdraw funds from user's balance
   * @param userId User ID
   * @param amount Amount to withdraw
   * @returns New balance
   */
  async withdraw(userId: string, amount: Decimal): Promise<Decimal> {
    const user = await this.getUser(userId);
    
    if (amount.isNegative() || amount.isZero()) {
      throw new Error('Withdrawal amount must be positive');
    }
    
    user.updateBalance(amount.negated());
    return user.getBalance();
  }

  /**
   * Get all orders associated with user
   * @param userId User ID
   * @returns Array of orders
   */
  async getUserOrders(userId: string): Promise<IOrder[]> {
    const user = await this.getUser(userId);
    
    if (!this.orderService) {
      throw new Error('Order service not initialized');
    }
    
    // Implementation depends on the user type
    switch (user.userType) {
      case UserType.CUSTOMER:
        const customer = user as Customer;
        return Promise.all(
          customer.getOrders().map(orderId => this.orderService.getOrder(orderId))
        );
      
      case UserType.CONTRACTOR:
        const contractor = user as Contractor;
        return Promise.all(
          contractor.getAssignedOrders().map(orderId => this.orderService.getOrder(orderId))
        );
      
      default:
        return [];
    }
  }
} 