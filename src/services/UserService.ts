import { User, UserType } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing users
 */
export class UserService {
  private users: Map<string, User> = new Map();
  private balances: Map<string, string> = new Map();

  /**
   * Create a new user
   * @param name User name
   * @param type User type
   * @returns Created user
   */
  async createUser(name: string, type: UserType): Promise<User> {
    const id = uuidv4();
    const user: User = {
      id,
      name,
      type,
      createdAt: new Date()
    };

    this.users.set(id, user);
    this.balances.set(id, '0');
    
    return user;
  }

  /**
   * Get user by ID
   * @param userId User ID
   * @returns User or null if not found
   */
  async getUser(userId: string): Promise<User | null> {
    return this.users.get(userId) || null;
  }

  /**
   * Get user's balance
   * @param userId User ID
   * @returns Balance as string
   */
  async getBalance(userId: string): Promise<string> {
    return this.balances.get(userId) || '0';
  }

  /**
   * Deposit funds to user's balance
   * @param userId User ID
   * @param amount Amount to deposit
   * @returns Updated user
   */
  async deposit(userId: string, amount: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const currentBalance = await this.getBalance(userId);
    const newBalance = (parseFloat(currentBalance) + parseFloat(amount)).toString();
    this.balances.set(userId, newBalance);
    
    return user;
  }

  /**
   * Withdraw funds from user's balance
   * @param userId User ID
   * @param amount Amount to withdraw
   * @returns Updated user
   */
  async withdraw(userId: string, amount: string): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }

    const currentBalance = await this.getBalance(userId);
    if (parseFloat(currentBalance) < parseFloat(amount)) {
      throw new Error('Insufficient funds');
    }

    const newBalance = (parseFloat(currentBalance) - parseFloat(amount)).toString();
    this.balances.set(userId, newBalance);
    
    return user;
  }
} 