export * from './UserInterfaces';
export * from './DocumentInterfaces';
export * from './OrderInterfaces';

// Предполагаемый интерфейс для Order, который мы ссылаемся в AIService
export interface Order {
  id: string;
  title: string;
  description: string;
  platformId: string;
  status: OrderStatus;
  customerId?: string;
  contractorId?: string;
  milestones: OrderMilestone[];
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface OrderMilestone {
  id: string;
  description: string;
  amount: string;
  deadline?: Date;
  status: MilestoneStatus;
  createdAt: Date;
  completedAt?: Date;
}

export enum OrderStatus {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum MilestoneStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
} 