import { v4 as uuidv4 } from 'uuid';

// --- Enums ---
export enum UserType {
  CUSTOMER = 'CUSTOMER',
  CONTRACTOR = 'CONTRACTOR',
  PLATFORM = 'PLATFORM',
}

export enum OrderStatus {
  CREATED = 'CREATED',
  FUNDED = 'FUNDED', // Assume sufficient funds are locked
  IN_PROGRESS = 'IN_PROGRESS', // Contractor assigned, work started
  COMPLETED = 'COMPLETED', // All milestones completed and paid
  DISPUTED = 'DISPUTED',
  CANCELLED = 'CANCELLED',
}

export enum MilestoneStatus {
    PENDING = 'PENDING',
    IN_PROGRESS = 'IN_PROGRESS', // Optional: if work on milestone started
    AWAITING_ACCEPTANCE = 'AWAITING_ACCEPTANCE', // Deliverables submitted, Act generated
    COMPLETED = 'COMPLETED', // Act signed, payment potentially released
    REJECTED = 'REJECTED', // Act rejected
}

export enum DocumentType {
  // AI Generated / Planning
  DEFINITION_OF_READY = 'DEFINITION_OF_READY', // DoR
  ROADMAP = 'ROADMAP',
  DEFINITION_OF_DONE = 'DEFINITION_OF_DONE', // DoD
  SPECIFICATION = 'SPECIFICATION',
  // Execution & Acceptance
  DELIVERABLE = 'DELIVERABLE',
  ACT_OF_WORK = 'ACT_OF_WORK', // Acceptance Act
}

export enum ActStatus {
  CREATED = 'CREATED', // Generated, awaiting signatures
  SIGNED_CONTRACTOR = 'SIGNED_CONTRACTOR', // Signed by contractor
  SIGNED_CUSTOMER = 'SIGNED_CUSTOMER', // Signed by customer (maybe only one signed)
  // SIGNED_PLATFORM = 'SIGNED_PLATFORM', // Only if platform signature is required by logic
  COMPLETED = 'COMPLETED', // Requires necessary signatures (e.g., Customer + Contractor)
  REJECTED = 'REJECTED', // Rejected by customer or platform
}

// --- Core Interfaces ---
export interface IUser {
  id: string;
  name: string;
  type: UserType;
  balance: number; // Simplified balance tracking
}

export interface IMilestone {
  id: string;
  orderId: string;
  description: string;
  amount: number; // Use number for calculations
  deadline: Date;
  status: MilestoneStatus;
  paid: boolean;
  // Optional link to a phase in a Roadmap document
  roadmapPhaseId?: string;
}

export interface IOrder {
  id: string;
  customerId: string;
  contractorId?: string; // Assigned later
  title: string;
  description: string;
  milestones: IMilestone[];
  status: OrderStatus;
  totalAmount: number;
  fundedAmount: number; // Amount currently locked in escrow
  createdAt: Date;
  // Group order fields omitted for simplicity
}

// --- Document Interfaces ---
export interface IDocumentBase {
  id: string;
  orderId: string;
  type: DocumentType;
  name: string; // Mandatory name
  createdBy: string; // User ID
  createdAt: Date;
  approvedBy?: string[]; // List of user IDs who approved (for documents needing approval)
  // Content structure depends on the specific document type
  content: unknown;
}

export interface IDoRDocument extends IDocumentBase {
  type: DocumentType.DEFINITION_OF_READY;
  content: {
    format: string;
    volume: string;
    resources: string[];
    recommendations: string[];
    timeline: string;
    risks: string[];
  };
}

export interface IRoadmapPhase {
  id: string; // Unique within the roadmap
  name: string;
  description: string;
  deliverables: string[]; // Descriptions of expected deliverables for this phase
  estimatedDuration: string;
  dependsOn?: string[]; // IDs of other phases this one depends on
}

export interface IRoadmapDocument extends IDocumentBase {
  type: DocumentType.ROADMAP;
  content: {
    phases: IRoadmapPhase[];
  };
}

export interface IDoDCriterion {
  id: string; // Unique within the DoD
  phaseId: string; // Links criterion to a roadmap phase
  description: string;
  checkMethod: string;
}

export interface IDoDDocument extends IDocumentBase {
  type: DocumentType.DEFINITION_OF_DONE;
  content: {
    criteria: IDoDCriterion[];
  };
}

export interface ISpecificationDocument extends IDocumentBase {
  type: DocumentType.SPECIFICATION;
  content: {
    requirements?: string[];
    scope?: string;
    details?: string; // Generic details field
    // Other relevant fields
  };
}

export interface IDeliverableDocument extends IDocumentBase {
  type: DocumentType.DELIVERABLE;
  phaseId: string; // Links deliverable to a roadmap phase
  submittedAt: Date;
  content: {
    details: string; // Description of the deliverable provided
    // Other custom fields possible
  };
  attachments?: string[]; // List of file names or identifiers
}

export interface IActSignature {
    userId: string;
    signedAt: Date;
}

// Using NodeJS.Timeout for simplicity, in browser use number
export type TimeoutHandle = NodeJS.Timeout;

export interface IAct extends IDocumentBase {
  type: DocumentType.ACT_OF_WORK;
  milestoneId: string; // The specific milestone this act accepts
  deliverableIds: string[]; // IDs of deliverables being accepted
  status: ActStatus;
  signedBy: IActSignature[];
  rejectionReason?: string;
  autoSignTimeoutHandle?: TimeoutHandle; // Store timeout handle if auto-sign is active
}

// Union type for any document
export type IDocument =
  | IDoRDocument
  | IRoadmapDocument
  | IDoDDocument
  | ISpecificationDocument
  | IDeliverableDocument
  | IAct;


// --- AI Validation Interfaces ---
export interface IValidationCriterionDetail {
    criterionId: string; // Criterion ID from DoD
    description: string;
    compliant: boolean;
    reason?: string; // Explanation if not compliant
    score?: number; // Optional score (0-1)
}

export interface IValidationResult {
    orderId: string;
    phaseId: string;
    deliverableIds: string[]; // Deliverables that were validated
    compliant: boolean; // Overall compliance status for the phase based on criteria
    overallScore: number; // e.g., percentage (0-100)
    details: IValidationCriterionDetail[]; // Breakdown per criterion
    checkedAt: Date;
}

// --- Helper function for creating Milestones within OrderService ---
export function createMilestone(orderId: string, data: Omit<IMilestone, 'id' | 'orderId' | 'status' | 'paid' | 'roadmapPhaseId'>, roadmapPhaseId?: string): IMilestone {
    return {
        ...data,
        id: uuidv4(),
        orderId: orderId,
        amount: Number(data.amount) || 0, // Ensure amount is number
        status: MilestoneStatus.PENDING,
        paid: false,
        deadline: new Date(data.deadline), // Ensure deadline is Date object
        roadmapPhaseId: roadmapPhaseId
    };
}