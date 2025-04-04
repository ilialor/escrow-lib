// Re-export enums from base interfaces for consumers
export { UserType, OrderStatus, MilestoneStatus, DocumentType, ActStatus } from '../interfaces/base';

// Define Event Names for EventEmitter
export enum EscrowEvents {
  // User Events
  USER_CREATED = 'user:created', // payload: IUser

  // Order Events
  ORDER_CREATED = 'order:created', // payload: IOrder
  ORDER_FUNDED = 'order:funded', // payload: { orderId: string; amount: number; newFundedAmount: number }
  ORDER_CONTRACTOR_ASSIGNED = 'order:contractorAssigned', // payload: { orderId: string; contractorId: string }
  ORDER_STATUS_CHANGED = 'order:statusChanged', // payload: { orderId: string; oldStatus: OrderStatus; newStatus: OrderStatus }
  ORDER_COMPLETED = 'order:completed', // payload: { orderId: string }

  // Milestone Events
  MILESTONE_STATUS_CHANGED = 'milestone:statusChanged', // payload: { orderId: string; milestoneId: string; oldStatus: MilestoneStatus; newStatus: MilestoneStatus }
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