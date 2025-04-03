import { Order, OrderStatus, MilestoneStatus, OrderMilestone } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing orders
 */
export class OrderService {
  private orders: Map<string, Order> = new Map();
  private groupOrderRepresentatives: Map<string, string> = new Map();
  private groupOrderContributions: Map<string, Map<string, string>> = new Map();
  private groupOrderVotes: Map<string, Map<string, string>> = new Map();

  /**
   * Create a new order
   * @param customerId Customer ID
   * @param title Order title
   * @param description Order description
   * @param milestones List of milestones
   * @returns Created order
   */
  async createOrder(
    customerId: string,
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<Order> {
    const id = uuidv4();
    const createdAt = new Date();
    
    const orderMilestones: OrderMilestone[] = milestones.map(m => ({
      id: uuidv4(),
      description: m.description,
      amount: m.amount,
      deadline: m.deadline,
      status: MilestoneStatus.PENDING,
      createdAt
    }));

    const order: Order = {
      id,
      title,
      description,
      platformId: 'platform', // Default platform ID
      status: OrderStatus.CREATED,
      customerId,
      milestones: orderMilestones,
      createdAt,
      updatedAt: createdAt
    };

    this.orders.set(id, order);
    return order;
  }

  /**
   * Create a group order with multiple customers
   * @param customerIds List of customer IDs
   * @param title Order title
   * @param description Order description
   * @param milestones List of milestones
   * @returns Created group order
   */
  async createGroupOrder(
    customerIds: string[],
    title: string,
    description: string,
    milestones: { description: string; amount: string; deadline?: Date }[]
  ): Promise<Order> {
    if (customerIds.length === 0) {
      throw new Error('Group order must have at least one customer');
    }

    // Create basic order
    const order = await this.createOrder(
      '', // Group orders don't have a single customer
      title,
      description,
      milestones
    );

    // Set representative as the first customer
    this.groupOrderRepresentatives.set(order.id, customerIds[0]);
    
    // Initialize contributions and votes
    const contributions = new Map<string, string>();
    const votes = new Map<string, string>();
    
    for (const customerId of customerIds) {
      contributions.set(customerId, '0');
      votes.set(customerId, customerIds[0]); // Initially vote for first customer
    }
    
    this.groupOrderContributions.set(order.id, contributions);
    this.groupOrderVotes.set(order.id, votes);
    
    // Add metadata
    order.metadata = {
      isGroupOrder: true,
      customerIds
    };
    
    return order;
  }

  /**
   * Get order by ID
   * @param orderId Order ID
   * @returns Order or null if not found
   */
  async getOrder(orderId: string): Promise<Order | null> {
    return this.orders.get(orderId) || null;
  }

  /**
   * Assign contractor to an order
   * @param orderId Order ID
   * @param contractorId Contractor ID
   * @returns Updated order
   */
  async assignContractor(orderId: string, contractorId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    order.contractorId = contractorId;
    order.updatedAt = new Date();
    
    return order;
  }

  /**
   * Contribute funds to an order
   * @param orderId Order ID
   * @param customerId Customer ID
   * @param amount Amount to contribute
   * @returns Updated order
   */
  async contributeFunds(orderId: string, customerId: string, amount: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    // Handle group order contributions
    if (order.metadata?.isGroupOrder) {
      const contributions = this.groupOrderContributions.get(orderId);
      if (!contributions) {
        throw new Error(`Contributions not found for order ${orderId}`);
      }

      const currentContribution = contributions.get(customerId) || '0';
      const newContribution = (parseFloat(currentContribution) + parseFloat(amount)).toString();
      contributions.set(customerId, newContribution);
      
      // Check if order is fully funded
      let totalContributed = 0;
      contributions.forEach(contribution => {
        totalContributed += parseFloat(contribution);
      });
      
      const totalRequired = order.milestones.reduce(
        (sum, milestone) => sum + parseFloat(milestone.amount),
        0
      );
      
      if (totalContributed >= totalRequired) {
        order.status = OrderStatus.FUNDED;
      }
    } else {
      // Single customer order
      if (order.customerId !== customerId) {
        throw new Error('Only the order customer can contribute funds to a single customer order');
      }
      
      const totalRequired = order.milestones.reduce(
        (sum, milestone) => sum + parseFloat(milestone.amount),
        0
      );
      
      // Set as funded if enough funds are contributed
      // In a real implementation, this would involve actual fund transfers
      if (parseFloat(amount) >= totalRequired) {
        order.status = OrderStatus.FUNDED;
      }
    }
    
    order.updatedAt = new Date();
    return order;
  }

  /**
   * Vote for representative in a group order
   * @param orderId Order ID
   * @param voterId Voter ID
   * @param candidateId Candidate ID
   * @returns true if representative changed, false otherwise
   */
  async voteForRepresentative(orderId: string, voterId: string, candidateId: string): Promise<boolean> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    if (!order.metadata?.isGroupOrder) {
      throw new Error('Voting is only available for group orders');
    }

    const votes = this.groupOrderVotes.get(orderId);
    if (!votes) {
      throw new Error(`Votes not found for order ${orderId}`);
    }

    // Set the voter's vote
    votes.set(voterId, candidateId);
    
    // Count votes
    const voteCounts = new Map<string, number>();
    
    votes.forEach(vote => {
      const count = voteCounts.get(vote) || 0;
      voteCounts.set(vote, count + 1);
    });
    
    // Find the candidate with the most votes
    let maxVotes = 0;
    let newRepresentative = '';
    
    voteCounts.forEach((count, candidate) => {
      if (count > maxVotes) {
        maxVotes = count;
        newRepresentative = candidate;
      }
    });
    
    const currentRepresentative = this.groupOrderRepresentatives.get(orderId);
    
    if (newRepresentative && currentRepresentative !== newRepresentative) {
      this.groupOrderRepresentatives.set(orderId, newRepresentative);
      return true;
    }
    
    return false;
  }

  /**
   * Complete a milestone
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @returns Updated order
   */
  async completeMilestone(orderId: string, milestoneId: string): Promise<Order> {
    const order = await this.getOrder(orderId);
    if (!order) {
      throw new Error(`Order with ID ${orderId} not found`);
    }

    const milestone = order.milestones.find(m => m.id === milestoneId);
    if (!milestone) {
      throw new Error(`Milestone with ID ${milestoneId} not found in order ${orderId}`);
    }

    milestone.status = MilestoneStatus.COMPLETED;
    milestone.completedAt = new Date();
    order.updatedAt = new Date();
    
    // Check if all milestones are completed
    const allCompleted = order.milestones.every(m => m.status === MilestoneStatus.COMPLETED);
    if (allCompleted) {
      order.status = OrderStatus.COMPLETED;
    }
    
    return order;
  }
} 