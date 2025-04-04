// Re-export enums from base interfaces for consumers
export { UserType, OrderStatus, MilestoneStatus, DocumentType, ActStatus } from '../interfaces/base';

// Define Event Names for EventEmitter
export enum EscrowEvents {
  // User Events
  USER_CREATED = 'user:created', // payload: IUser
  USER_DEPOSIT = 'user:deposit', // Renamed for clarity from 'deposit' if it existed

  // Order Events
  ORDER_CREATED = 'order:created', // payload: IOrder
  GROUP_ORDER_CREATED = 'group-order:created', // New event for group orders
  ORDER_CONTRACTOR_ASSIGNED = 'order:contractor-assigned',
  ORDER_FUNDS_CONTRIBUTED = 'order:funds-contributed', // New event for contributions
  ORDER_FUNDED = 'order:funded', // Emitted when order reaches full funding
  ORDER_STATUS_CHANGED = 'order:status-changed',
  ORDER_COMPLETED = 'order:completed',
  GROUP_ORDER_REPRESENTATIVE_CHANGED = 'group-order:representative-changed', // payload: { orderId: string, oldRepresentativeId?: string, newRepresentativeId: string }

  // Milestone Events
  MILESTONE_STATUS_CHANGED = 'milestone:status-changed', // payload: { orderId: string; milestoneId: string; oldStatus: MilestoneStatus; newStatus: MilestoneStatus }
  MILESTONE_COMPLETED = 'milestone:completed', // payload: { orderId: string; milestoneId: string } // Act approved
  MILESTONE_PAID = 'milestone:paid', // payload: { orderId: string; milestoneId: string; amount: number }

  // Document Events
  DOCUMENT_CREATED = 'document:created', // payload: IDocument (generic)
  DOCUMENT_APPROVED = 'document:approved', // payload: { documentId: string; userId: string }

  // AI Specific Document Events
  DOR_GENERATED = 'dor:generated', // payload: IDoRDocument
  ROADMAP_GENERATED = 'roadmap:generated', // payload: IRoadmapDocument
  DOD_GENERATED = 'dod:generated', // payload: IDoDDocument

  // Deliverable Events
  DELIVERABLE_SUBMITTED = 'deliverable:submitted', // payload: IDeliverableDocument
  DELIVERABLE_VALIDATED = 'deliverable:validated', // payload: IValidationResult

  // Act Events
  ACT_CREATED = 'act:created', // payload: IAct
  ACT_SIGNED = 'act:signed', // payload: { actId: string; userId: string; newStatus: ActStatus }
  ACT_REJECTED = 'act:rejected', // payload: { actId: string; userId: string; reason?: string }
  ACT_COMPLETED = 'act:completed', // payload: { actId: string; milestoneId: string } // Act fully signed
}