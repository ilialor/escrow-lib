import { UserType } from './UserInterfaces';

/**
 * Types of documents supported by the system
 */
export enum DocumentType {
  /** Definition of Ready - describes criteria for starting work */
  DEFINITION_OF_READY = 'DEFINITION_OF_READY',
  
  /** Roadmap - describes project phases and timeline */
  ROADMAP = 'ROADMAP',
  
  /** Definition of Done - describes acceptance criteria */
  DEFINITION_OF_DONE = 'DEFINITION_OF_DONE',
  
  /** Deliverable - actual work result */
  DELIVERABLE = 'DELIVERABLE',
  
  /** Act of Work - document confirming completion of work */
  ACT_OF_WORK = 'ACT_OF_WORK',
  
  /** Technical specification */
  SPECIFICATION = 'SPECIFICATION'
}

/**
 * Status values for work acts
 */
export enum ActStatus {
  /** Initial state after creation */
  CREATED = 'CREATED',
  
  /** Signed by contractor */
  SIGNED_CONTRACTOR = 'SIGNED_CONTRACTOR',
  
  /** Signed by customer */
  SIGNED_CUSTOMER = 'SIGNED_CUSTOMER',
  
  /** Signed by platform */
  SIGNED_PLATFORM = 'SIGNED_PLATFORM',
  
  /** All signatures collected, act completed */
  COMPLETED = 'COMPLETED',
  
  /** Act was rejected */
  REJECTED = 'REJECTED'
}

/**
 * Base document interface
 */
export interface Document {
  /** Unique identifier */
  id: string;
  
  /** Related order ID */
  orderId: string;
  
  /** Document type */
  type: DocumentType;
  
  /** Content of the document (structure depends on type) */
  content: any;
  
  /** Creator's user ID */
  createdBy: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Last modification timestamp */
  updatedAt: Date;
  
  /** List of approvals */
  approvals?: DocumentApproval[];
  
  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Document approval record
 */
export interface DocumentApproval {
  /** User ID who approved */
  userId: string;
  
  /** User type */
  userType: UserType;
  
  /** Approval timestamp */
  approvedAt: Date;
  
  /** Optional comments */
  comments?: string;
}

/**
 * Structure for Definition of Ready document content
 */
export interface DoRContent {
  /** Project objectives */
  objectives: string[];
  
  /** Stakeholders and their roles */
  stakeholders: {
    role: string;
    responsibilities: string[];
  }[];
  
  /** Success criteria */
  successCriteria: string[];
  
  /** Requirements list */
  requirements: string[];
  
  /** Technical feasibility assessment */
  technicalFeasibility: {
    assessment: string;
    challenges: string[];
  };
  
  /** Resource requirements */
  resourceRequirements: string[];
  
  /** Risk assessment */
  risks: {
    description: string;
    mitigation: string;
  }[];
  
  /** Acceptance criteria */
  acceptanceCriteria: string[];
  
  /** Timeline estimation */
  timeline: {
    estimatedDuration: string;
    majorMilestones: string[];
  };
}

/**
 * Structure for Roadmap document content
 */
export interface RoadmapContent {
  /** Project summary */
  projectSummary: string;
  
  /** Project phases */
  phases: {
    /** Phase unique identifier */
    id: string;
    
    /** Phase name */
    name: string;
    
    /** Phase description */
    description: string;
    
    /** Phase estimated duration */
    estimatedDuration: string;
    
    /** Tasks in the phase */
    tasks: {
      /** Task identifier */
      id: string;
      
      /** Task description */
      description: string;
      
      /** Estimated effort */
      estimatedEffort: string;
      
      /** Dependencies on other tasks */
      dependencies: string[];
    }[];
    
    /** Expected deliverables */
    deliverables: string[];
    
    /** Milestone markers */
    milestones: string[];
  }[];
}

/**
 * Structure for Definition of Done document content
 */
export interface DoDContent {
  /** General acceptance criteria */
  generalCriteria: {
    /** Criteria category */
    category: string;
    
    /** List of criteria */
    criteria: string[];
  }[];
  
  /** Phase-specific criteria */
  phaseCriteria: {
    /** ID of the phase (matches roadmap phase ID) */
    phaseId: string;
    
    /** Acceptance criteria for this phase */
    criteria: {
      /** Deliverable name */
      deliverable: string;
      
      /** Acceptance criteria list */
      acceptanceCriteria: string[];
    }[];
  }[];
  
  /** Quality assurance checklist */
  qualityChecklist: string[];
  
  /** Description of approval process */
  approvalProcess: string;
}

/**
 * Structure for deliverable submission
 */
export interface Deliverable {
  /** Unique identifier */
  id: string;
  
  /** Order ID this deliverable belongs to */
  orderId: string;
  
  /** Phase ID from roadmap */
  phaseId?: string;
  
  /** Title of the deliverable */
  title: string;
  
  /** Description of the deliverable */
  description: string;
  
  /** Files associated with this deliverable */
  files?: string[];
  
  /** Submitted by user ID */
  submittedBy: string;
  
  /** Submission timestamp */
  submittedAt: Date;
  
  /** Additional details specific to this deliverable */
  details?: Record<string, any>;
}

/**
 * Structure for work act document
 */
export interface ActDocument {
  /** Unique identifier */
  id: string;
  
  /** Order ID this act belongs to */
  orderId: string;
  
  /** Milestone ID this act is for */
  milestoneId: string;
  
  /** Current status of the act */
  status: ActStatus;
  
  /** Deliverables included in this act */
  deliverableIds: string[];
  
  /** User who created the act */
  createdBy: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Signatures on the act */
  signatures: {
    /** User who signed */
    userId: string;
    
    /** User type */
    userType: UserType;
    
    /** Signing timestamp */
    signedAt: Date;
  }[];
  
  /** Additional metadata */
  metadata?: Record<string, any>;
} 