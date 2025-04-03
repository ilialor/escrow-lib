import { UserType } from './UserInterfaces';

// Import enums from constants
import { DocumentType, ActStatus } from '../utils/constants';

/**
 * Types of documents supported by the system
 */
// Removed duplicate enum
/*
export enum DocumentType {
  DEFINITION_OF_READY = 'DEFINITION_OF_READY',
  ROADMAP = 'ROADMAP',
  DEFINITION_OF_DONE = 'DEFINITION_OF_DONE',
  DELIVERABLE = 'DELIVERABLE',
  ACT_OF_WORK = 'ACT_OF_WORK',
  SPECIFICATION = 'SPECIFICATION'
}
*/

/**
 * Status values for work acts
 */
// Removed duplicate enum
/*
export enum ActStatus {
  CREATED = 'CREATED',
  SIGNED_CONTRACTOR = 'SIGNED_CONTRACTOR',
  SIGNED_CUSTOMER = 'SIGNED_CUSTOMER',
  SIGNED_PLATFORM = 'SIGNED_PLATFORM',
  COMPLETED = 'COMPLETED',
  REJECTED = 'REJECTED'
}
*/

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

// Remove Deliverable interface
/*
export interface Deliverable {
  id: string;
  orderId: string;
  phaseId?: string;
  title: string;
  description: string;
  files?: string[];
  submittedBy: string;
  submittedAt: Date;
  details?: Record<string, any>;
}
*/

// Remove ActDocument interface
/*
export interface ActDocument extends Document {
  milestoneId: string;
  status: ActStatus;
  signatures?: DocumentApproval[];
  deliverableIds: string[];
}
*/

// Remove SpecificationDocument interface
/*
export interface SpecificationDocument extends Document {
  // specific fields for specification
}
*/ 