import { Decimal } from 'decimal.js';
import { IOrderService } from '../interfaces/services';
import { IOrder, IAct } from '../interfaces/base';
import { Order } from '../models/order';
import { OrderStatus, UserType } from '../utils/constants';
import { Customer, Contractor } from '../models/user';

/**
 * Service for managing orders and escrow process
 */
export class OrderService implements IOrderService {
  private orders: Map<string, IOrder>;
  private acts: Map<string, IAct>;
  private userService: any; // Will be set via setUserService method
  
  constructor() {
    this.orders = new Map<string, IOrder>();
    this.acts = new Map<string, IAct>();
  }
  
  /**
   * Set user service instance for cross-service communication
   * @param userService UserService instance
   */
  setUserService(userService: any): void {
    this.userService = userService;
  }

  /**
   * Create a new order
   * @param creatorId Customer ID who is creating the order
   * @param title Order title
   * @param description Order description
   * @param milestones Array of milestone data
   * @param isGroupOrder Whether this is a group order with multiple participants
   * @returns Created order
   */
  async createOrder(
    creatorId: string, 
    title: string, 
    description: string, 
    milestones: { description: string; amount: number | string; deadline?: Date }[],
    isGroupOrder: boolean = false
  ): Promise<IOrder> {
    // Verify creator exists and is a customer
    const creator = await this.userService.getUser(creatorId);
    if (creator.userType !== UserType.CUSTOMER) {
      throw new Error('Only customers can create orders');
    }
    
    // Validate milestone data
    if (!milestones || milestones.length === 0) {
      throw new Error('Order must have at least one milestone');
    }
    
    // Create order
    const order = new Order(creatorId, title, description, milestones, isGroupOrder);
    this.orders.set(order.id, order);
    
    // Add order to customer's orders
    (creator as Customer).addOrder(order.id);
    
    return order;
  }

  /**
   * Get order by ID
   * @param orderId Order ID
   * @returns Order instance
   */
  async getOrder(orderId: string): Promise<IOrder> {
    const order = this.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }
    return order;
  }

  /**
   * Get the contributions made by participants to an order
   * @param orderId Order ID
   * @returns Map of user IDs to contribution amounts
   */
  async getOrderContributions(orderId: string): Promise<Record<string, Decimal>> {
    const order = await this.getOrder(orderId);
    const contributionsMap: Record<string, Decimal> = {};
    
    // Convert the Map to a plain object for API consistency
    for (const [userId, amount] of order.contributors.entries()) {
      contributionsMap[userId] = amount;
    }
    
    return contributionsMap;
  }

  /**
   * Join an order by contributing funds
   * @param orderId Order ID
   * @param userId User ID joining the order
   * @param contribution Initial contribution amount
   * @returns Updated order
   */
  async joinOrder(
    orderId: string, 
    userId: string, 
    contribution: number | string
  ): Promise<IOrder> {
    // Validate inputs
    const order = await this.getOrder(orderId);
    const user = await this.userService.getUser(userId);
    
    if (user.userType !== UserType.CUSTOMER) {
      throw new Error('Only customers can join orders');
    }
    
    if (order.status !== OrderStatus.CREATED) {
      throw new Error(`Cannot join order in ${order.status} state`);
    }
    
    const contributionAmount = new Decimal(contribution);
    
    if (!contributionAmount.isZero()) {
      // Check user balance only for non-zero contributions
      if (user.getBalance().lessThan(contributionAmount)) {
        throw new Error('Insufficient funds');
      }
      
      // Transfer funds from user balance to escrow
      await this.userService.withdraw(userId, contributionAmount);
      order.addContribution(userId, contributionAmount);
    } else {
      // For zero contributions, just add the user to the participants
      if (!order.participants.includes(userId)) {
        order.participants.push(userId);
      }
    }
    
    // Add order to customer's orders
    (user as Customer).addOrder(order.id);
    
    return order;
  }

  /**
   * Assign contractor to an order
   * @param orderId Order ID
   * @param contractorId Contractor ID
   * @returns Updated order
   */
  async assignContractor(orderId: string, contractorId: string): Promise<IOrder> {
    // Validate inputs
    const order = await this.getOrder(orderId);
    const contractor = await this.userService.getUser(contractorId);
    
    if (contractor.userType !== UserType.CONTRACTOR) {
      throw new Error('Only contractors can be assigned to orders');
    }
    
    if (order.status !== OrderStatus.FUNDED) {
      throw new Error(`Cannot assign contractor to order in ${order.status} state`);
    }
    
    // Update order
    order.contractorId = contractorId;
    
    // Add order to contractor's assigned orders
    (contractor as Contractor).assignOrder(order.id);
    
    return order;
  }

  /**
   * Add funds to an order
   * @param orderId Order ID
   * @param userId User ID contributing funds
   * @param amount Amount to contribute
   * @returns Updated order
   */
  async contributeFunds(
    orderId: string, 
    userId: string, 
    amount: number | string
  ): Promise<IOrder> {
    // Validate inputs
    const order = await this.getOrder(orderId);
    const user = await this.userService.getUser(userId);
    
    if (order.status === OrderStatus.COMPLETED) {
      throw new Error('Cannot contribute to completed order');
    }
    
    const contributionAmount = new Decimal(amount);
    
    // Check user balance
    if (user.getBalance().lessThan(contributionAmount)) {
      throw new Error('Insufficient funds');
    }
    
    // Transfer funds from user balance to escrow
    await this.userService.withdraw(userId, contributionAmount);
    order.addContribution(userId, contributionAmount);
    
    // If new customer, add order to their list
    if (user.userType === UserType.CUSTOMER && !order.contributors.has(userId)) {
      (user as Customer).addOrder(order.id);
    }
    
    return order;
  }

  /**
   * Mark a milestone as complete by contractor
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param contractorId Contractor ID
   * @returns Created Act
   */
  async markMilestoneComplete(
    orderId: string, 
    milestoneId: string, 
    contractorId: string
  ): Promise<IAct> {
    // Validate inputs
    const order = await this.getOrder(orderId);
    
    if (order.contractorId !== contractorId) {
      throw new Error('Only the assigned contractor can mark milestones complete');
    }
    
    const act = order.markMilestoneCompleteByContractor(milestoneId);
    this.acts.set(act.id, act);
    
    return act;
  }

  /**
   * Sign an act of milestone completion
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns true if the act is now complete, false otherwise
   */
  async signAct(actId: string, userId: string): Promise<boolean> {
    // Validate inputs
    const act = this.acts.get(actId);
    if (!act) {
      throw new Error(`Act not found: ${actId}`);
    }
    
    const user = await this.userService.getUser(userId);
    
    // Find the order and milestone this act belongs to
    let foundOrder: IOrder | undefined;
    let foundMilestoneId: string | undefined;
    
    for (const order of this.orders.values()) {
      const milestone = order.getMilestones().find(m => m.act?.id === actId);
      if (milestone) {
        foundOrder = order;
        foundMilestoneId = milestone.id;
        break;
      }
    }
    
    if (!foundOrder || !foundMilestoneId) {
      throw new Error('Cannot find order and milestone for this act');
    }
    
    // Check if user is authorized to sign
    // Platform admins, the assigned contractor, or the current representative can sign
    const isAuthorized = 
      user.userType === UserType.PLATFORM ||
      (foundOrder.contractorId === userId) ||
      (foundOrder.representativeId === userId);
    
    if (!isAuthorized) {
      throw new Error('User not authorized to sign this act');
    }
    
    // Add signature
    const isComplete = act.addSignature(userId);
    
    // If act is now complete, release funds
    if (isComplete) {
      const amount = foundOrder.releaseFundsForMilestone(foundMilestoneId);
      
      // Transfer funds to contractor
      if (foundOrder.contractorId) {
        await this.userService.deposit(foundOrder.contractorId, amount);
      }
    }
    
    return isComplete;
  }

  /**
   * Vote for a new representative
   * @param orderId Order ID
   * @param voterId Voter ID
   * @param candidateId Candidate ID
   * @returns true if representative changed, false otherwise
   */
  async voteForRepresentative(
    orderId: string, 
    voterId: string, 
    candidateId: string
  ): Promise<boolean> {
    // Validate inputs
    const order = await this.getOrder(orderId);
    
    // Verify voter and candidate exist and are customers
    await this.userService.getUser(voterId);
    const candidate = await this.userService.getUser(candidateId);
    
    if (candidate.userType !== UserType.CUSTOMER) {
      throw new Error('Only customers can be representatives');
    }
    
    // Record vote
    order.addVote(voterId, candidateId);
    
    // Check votes returns true if representative changed
    return order.checkVotes();
  }

  /**
   * Get orders by status
   * @param status Order status to filter by
   * @returns Array of matching orders
   */
  async getOrdersByStatus(status: OrderStatus): Promise<IOrder[]> {
    const result: IOrder[] = [];
    
    for (const order of this.orders.values()) {
      if (order.status === status) {
        result.push(order);
      }
    }
    
    return result;
  }

  /**
   * Create a new group order
   * @param customerIds List of customer IDs creating the order
   * @param title Order title
   * @param description Order description
   * @param milestones Array of milestone data
   * @returns Created group order
   */
  async createGroupOrder(
    customerIds: string[],
    title: string,
    description: string,
    milestones: { description: string; amount: number | string; deadline?: Date }[]
  ): Promise<IOrder> {
    if (!customerIds || customerIds.length === 0) {
        throw new Error('Group order must have at least one customer');
    }

    // Verify all creators exist and are customers
    const customerUsers: Customer[] = [];
    for (const customerId of customerIds) {
        const user = await this.userService.getUser(customerId);
        if (user.userType !== UserType.CUSTOMER) {
            throw new Error(`User ${customerId} is not a customer and cannot create a group order`);
        }
        customerUsers.push(user as Customer);
    }

    // Validate milestone data
    if (!milestones || milestones.length === 0) {
      throw new Error('Order must have at least one milestone');
    }

    // Use the first customer as the initial creator/representative for the Order model
    const creatorId = customerIds[0];
    const order = new Order(creatorId, title, description, milestones, true); // Pass true for isGroupOrder

    // Add all customers as participants and add order to their lists
    for (const customer of customerUsers) {
        if (!order.participants.includes(customer.id)) {
             order.participants.push(customer.id);
        }
        customer.addOrder(order.id);
        // Initial contributions might be handled later via contributeFunds or joinOrder
        // Or set initial zero contributions here if needed:
        // if (!order.contributors.has(customer.id)) {
        //     order.contributors.set(customer.id, new Decimal(0));
        // }
    }
    // Set the representative to the first customer initially
    order.representativeId = creatorId;

    this.orders.set(order.id, order);
    return order;
  }
} 