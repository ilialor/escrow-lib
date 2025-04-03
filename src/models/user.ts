import { Decimal } from 'decimal.js';
import { v4 as uuidv4 } from 'uuid';
import { IUser } from '../interfaces/base';
import { UserType } from '../utils/constants';

/**
 * Base User class that implements IUser interface
 */
export class User implements IUser {
  id: string;
  name: string;
  balance: Decimal;
  userType: UserType;

  constructor(name: string, userType: UserType, id?: string, initialBalance?: number | string) {
    this.id = id || uuidv4();
    this.name = name;
    this.userType = userType;
    this.balance = initialBalance ? new Decimal(initialBalance) : new Decimal(0);
  }

  /**
   * Get current balance
   */
  getBalance(): Decimal {
    return this.balance;
  }

  /**
   * Update user balance
   * @param amount Amount to add (positive) or subtract (negative)
   */
  updateBalance(amount: Decimal): void {
    if (amount.isNegative() && this.balance.lessThan(amount.abs())) {
      throw new Error('Insufficient funds');
    }
    this.balance = this.balance.plus(amount);
  }
}

/**
 * Customer class extending base User
 */
export class Customer extends User {
  orders: Set<string>;

  constructor(name: string, id?: string, initialBalance?: number | string) {
    super(name, UserType.CUSTOMER, id, initialBalance);
    this.orders = new Set<string>();
  }

  /**
   * Add order to customer's orders list
   * @param orderId Order ID
   */
  addOrder(orderId: string): void {
    this.orders.add(orderId);
  }

  /**
   * Get all orders associated with this customer
   */
  getOrders(): string[] {
    return Array.from(this.orders);
  }
}

/**
 * Contractor class extending base User
 */
export class Contractor extends User {
  assignedOrders: Set<string>;

  constructor(name: string, id?: string, initialBalance?: number | string) {
    super(name, UserType.CONTRACTOR, id, initialBalance);
    this.assignedOrders = new Set<string>();
  }

  /**
   * Assign order to contractor
   * @param orderId Order ID
   */
  assignOrder(orderId: string): void {
    this.assignedOrders.add(orderId);
  }

  /**
   * Get all orders assigned to this contractor
   */
  getAssignedOrders(): string[] {
    return Array.from(this.assignedOrders);
  }
}

/**
 * Platform admin user with special permissions
 */
export class PlatformAdmin extends User {
  constructor(name: string, id?: string) {
    super(name, UserType.PLATFORM, id);
  }
} 