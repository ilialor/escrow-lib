/**
 * Status values for orders
 */
export enum OrderStatus {
  /** Initial state after creation */
  CREATED = 'CREATED',
  
  /** Order has been fully funded */
  FUNDED = 'FUNDED',
  
  /** Work on the order has started */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** All milestones completed */
  COMPLETED = 'COMPLETED',
  
  /** Order was canceled */
  CANCELED = 'CANCELED'
}

/**
 * Status values for milestones
 */
export enum MilestoneStatus {
  /** Initial state */
  PENDING = 'PENDING',
  
  /** Work on milestone has started */
  IN_PROGRESS = 'IN_PROGRESS',
  
  /** Milestone completed */
  COMPLETED = 'COMPLETED',
  
  /** Milestone canceled */
  CANCELED = 'CANCELED'
}

/**
 * Order interface
 */
export interface Order {
  /** Unique identifier */
  id: string;
  
  /** Order title */
  title: string;
  
  /** Order description */
  description: string;
  
  /** ID of the platform user */
  platformId: string;
  
  /** Current order status */
  status: OrderStatus;
  
  /** ID of the customer (single customer) */
  customerId?: string;
  
  /** ID of the contractor */
  contractorId?: string;
  
  /** List of milestones */
  milestones: OrderMilestone[];
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last update timestamp */
  updatedAt: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Order milestone interface
 */
export interface OrderMilestone {
  /** Unique identifier */
  id: string;
  
  /** Milestone description */
  description: string;
  
  /** Amount allocated for this milestone */
  amount: string;
  
  /** Optional deadline */
  deadline?: Date;
  
  /** Current milestone status */
  status: MilestoneStatus;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Completion timestamp */
  completedAt?: Date;
}

/**
 * Group order interface extending regular order
 */
export interface GroupOrder extends Order {
  /** List of customer IDs participating in the group order */
  customerIds: string[];
  
  /** ID of the customer representative */
  representativeId: string;
  
  /** Map of contributions by customer ID */
  contributions: Record<string, string>;
} 