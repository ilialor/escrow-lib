import { v4 as uuidv4 } from 'uuid';
import {
    createMilestone,
    IMilestone,
    IOrder,
    IUser,
    MilestoneStatus,
    OrderStatus,
    UserType
} from '../interfaces';
import { DocumentService } from './document.service'; // Keep import

// Define a simpler structure for milestone creation input
export interface IMilestoneInputData {
    description: string;
    amount: string | number; // Allow string or number input
    deadline: Date | string; // Allow string or Date input
}

export class OrderService {
  // In-memory storage
  private orders: Map<string, IOrder> = new Map();
  // Keep DocumentService potentially undefined initially
  private documentService!: DocumentService; // Use definite assignment assertion

  // Constructor might not need documentService immediately
  constructor() {
      // Initialization logic if needed, but dependency set later
  }

  // Setter for Dependency Injection after construction
  setDocumentService(docService: DocumentService): void {
       if (!this.documentService) { // Prevent reassignment if needed
            this.documentService = docService;
            console.log("[OrderService] DocumentService dependency injected.");
       }
  }


  async createOrder(
    customerId: string,
    title: string,
    description: string,
    milestoneData: IMilestoneInputData[]
  ): Promise<IOrder> {
    if (!customerId || !title || milestoneData.length === 0) {
      throw new Error('Customer ID, title, and at least one milestone are required.');
    }

    const orderId = uuidv4();
    let totalAmount = 0;
    const milestones: IMilestone[] = [];

    milestoneData.forEach((m) => {
        const amount = Number(m.amount) || 0;
        totalAmount += amount;
        // Ensure deadline is a Date object BEFORE passing to createMilestone
        const deadlineDate = typeof m.deadline === 'string' ? new Date(m.deadline) : m.deadline;
        if (isNaN(deadlineDate.getTime())) { // Check if date is valid
             throw new Error(`Invalid deadline format provided: ${m.deadline}`);
        }
        // Now deadlineDate is guaranteed to be a valid Date
        milestones.push(createMilestone(orderId, { ...m, amount, deadline: deadlineDate })); // Pass the validated Date
    });

    const newOrder: IOrder = {
      id: orderId,
      customerId,
      title,
      description,
      milestones,
      status: OrderStatus.CREATED,
      totalAmount,
      fundedAmount: 0,
      createdAt: new Date(),
      contractorId: undefined,
    };

    this.orders.set(newOrder.id, newOrder);
    console.log(`[OrderService] Created order: "${title}", ID: ${newOrder.id}`);
    return { ...newOrder, milestones: [...newOrder.milestones] };
  }

  async getOrder(id: string): Promise<IOrder | null> {
    const order = this.orders.get(id);
    return order ? { ...order, milestones: [...order.milestones] } : null; // Return copy
  }

  async findOrdersByUserId(userId: string): Promise<IOrder[]> {
      const userOrders: IOrder[] = [];
      this.orders.forEach(order => {
          if (order.customerId === userId || order.contractorId === userId) {
              userOrders.push({ ...order, milestones: [...order.milestones] });
          }
      });
      return userOrders;
  }

  async assignContractor(orderId: string, contractorId: string, assigningUser: IUser): Promise<IOrder> {
      const order = this.orders.get(orderId);
      if (!order) throw new Error(`Order ${orderId} not found.`);
      // Basic permission check: only customer or platform can assign
      if (assigningUser.id !== order.customerId && assigningUser.type !== UserType.PLATFORM) {
          throw new Error(`User ${assigningUser.id} does not have permission to assign a contractor to order ${orderId}.`);
      }
       if (order.contractorId) {
           throw new Error(`Order ${orderId} already has an assigned contractor: ${order.contractorId}.`);
       }
       if (order.status !== OrderStatus.CREATED && order.status !== OrderStatus.FUNDED) {
           throw new Error(`Cannot assign contractor to order in status ${order.status}.`);
       }

      order.contractorId = contractorId;
      // Change status only if funded, otherwise remains CREATED until funding? Assume IN_PROGRESS if funded.
      if (order.fundedAmount >= order.totalAmount) {
          order.status = OrderStatus.IN_PROGRESS;
          console.log(`[OrderService] Assigned contractor ${contractorId} to order ${orderId}. Status changed to ${order.status}.`);
      } else {
           console.log(`[OrderService] Assigned contractor ${contractorId} to order ${orderId}. Order remains ${order.status} until fully funded.`);
      }

      return { ...order, milestones: [...order.milestones] };
  }

  async fundOrder(orderId: string, amount: number): Promise<{ order: IOrder, newFundedAmount: number }> {
       if (amount <= 0) throw new Error('Funding amount must be positive.');
       const order = this.orders.get(orderId);
       if (!order) throw new Error(`Order ${orderId} not found.`);
       if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.COMPLETED) {
            throw new Error(`Cannot fund order in status ${order.status}.`);
       }

       order.fundedAmount += amount;
       const isFullyFunded = order.fundedAmount >= order.totalAmount;
       console.log(`[OrderService] Funded order ${orderId} with ${amount}. Total funded: ${order.fundedAmount}/${order.totalAmount}`);

       // If fully funded and contractor assigned, move to IN_PROGRESS
       if (isFullyFunded && order.contractorId && order.status === OrderStatus.CREATED) {
           order.status = OrderStatus.IN_PROGRESS;
           console.log(`[OrderService] Order ${orderId} is now fully funded and contractor assigned. Status changed to ${order.status}.`);
       } else if (isFullyFunded && order.status === OrderStatus.CREATED) {
            order.status = OrderStatus.FUNDED; // Fully funded but no contractor yet
            console.log(`[OrderService] Order ${orderId} is now fully funded. Status changed to ${order.status}.`);
       }


       return { order: { ...order, milestones: [...order.milestones] }, newFundedAmount: order.fundedAmount };
   }

    // Check if all milestones are COMPLETED, if so, mark Order as COMPLETED
    private checkAndUpdateOrderStatus(order: IOrder): void {
        if (!order) return; // Add null check
        const allMilestonesCompleted = order.milestones.every(m => m.status === MilestoneStatus.COMPLETED);
        if (allMilestonesCompleted && order.status !== OrderStatus.COMPLETED) {
            const oldStatus = order.status; // Capture old status before changing
            order.status = OrderStatus.COMPLETED;
            console.log(`[OrderService] All milestones completed for order ${order.id}. Order status updated to ${OrderStatus.COMPLETED}.`);
            // EscrowManager should emit ORDER_COMPLETED and ORDER_STATUS_CHANGED
            // We need a way for OrderService to notify EscrowManager, or EscrowManager polls/checks after milestone changes.
            // For simplicity, EscrowManager will check status after milestone updates.
        }
   }
    // Update Order Status directly (e.g., for cancellation, dispute)
    async updateOrderStatus(orderId: string, newStatus: OrderStatus): Promise<IOrder> {
        const order = this.orders.get(orderId);
        if (!order) throw new Error(`Order ${orderId} not found.`);
        // Add validation for allowed status transitions if needed
        const oldStatus = order.status;
         if (oldStatus === newStatus) return { ...order, milestones: [...order.milestones] }; // No change

        order.status = newStatus;
        console.log(`[OrderService] Order ${orderId} status manually updated from ${oldStatus} to ${newStatus}.`);
        return { ...order, milestones: [...order.milestones] };
    }

    // Internal method to update milestone status, potentially called when an Act is processed
    async updateMilestoneStatus(orderId: string, milestoneId: string, newStatus: MilestoneStatus): Promise<IMilestone | null> {
        const order = this.orders.get(orderId);
        if (!order) return null;
        const milestone = order.milestones.find(m => m.id === milestoneId);
        if (!milestone) return null;

         const oldStatus = milestone.status;
         if (oldStatus === newStatus) return { ...milestone }; // No change

        milestone.status = newStatus;
        console.log(`[OrderService] Milestone ${milestoneId} in order ${orderId} status updated from ${oldStatus} to ${newStatus}.`);

        // Check if all milestones are completed to potentially update order status
        this.checkAndUpdateOrderStatus(order); // This now correctly checks after update

        return { ...milestone };
    }

    // Internal method to mark milestone as paid, potentially called after Act completion and fund release
   async markMilestonePaid(orderId: string, milestoneId: string): Promise<IMilestone | null> {
       const order = this.orders.get(orderId);
       if (!order) return null;
       const milestone = order.milestones.find(m => m.id === milestoneId);
       if (!milestone) return null;
        if (milestone.paid) return { ...milestone }; // Already paid

        if (milestone.status !== MilestoneStatus.COMPLETED) {
            console.warn(`[OrderService] Cannot mark milestone ${milestoneId} as paid. Its status is ${milestone.status}, not COMPLETED.`);
            // Decide: throw error or return null? Returning null for now.
            return null;
        }
       milestone.paid = true;
       console.log(`[OrderService] Milestone ${milestoneId} in order ${orderId} marked as paid.`);
       // Potentially deduct from fundedAmount if tracking escrow release here
       return { ...milestone };
   }

}
