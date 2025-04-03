/**
 * Constants used throughout the escrow library
 */

export const PLATFORM_SIGNATURE_ID = 'PLATFORM';

export enum OrderStatus {
  CREATED = 'created',
  FUNDED = 'funded',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum MilestoneStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  PAID = 'paid'
}

export enum UserType {
  CUSTOMER = 'customer',
  CONTRACTOR = 'contractor',
  PLATFORM = 'platform'
}

export enum DocumentType {
  DEFINITION_OF_READY = 'definition_of_ready',
  DEFINITION_OF_DONE = 'definition_of_done',
  ROADMAP = 'roadmap',
  ACT_OF_WORK = 'act_of_work',
  DELIVERABLE = 'deliverable',
  SPECIFICATION = 'specification'
}

export enum MessageType {
  TEXT = 'text',
  FILE = 'file',
  SYSTEM = 'system'
}

export enum ActStatus {
  CREATED = 'created',
  SIGNED_CONTRACTOR = 'signed_contractor',
  SIGNED_CUSTOMER = 'signed_customer',
  SIGNED_PLATFORM = 'signed_platform',
  COMPLETED = 'completed',
  REJECTED = 'rejected'
}

export enum DeliverableType {
  DOCUMENT = 'document',
  CODE = 'code',
  DESIGN = 'design',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other'
}

// Minimum number of signatures required to complete an act
export const MIN_SIGNATURES_REQUIRED = 2;

// Percentage threshold for voting to change representative (75%)
export const REP_VOTE_THRESHOLD_PERCENT = 75;

// Maximum message length
export const MAX_MESSAGE_LENGTH = 2000;

// Default pagination sizes
export const DEFAULT_PAGE_SIZE = 20;

/**
 * Default deadline for signing acts in days
 */
export const DEFAULT_ACT_SIGNING_DEADLINE_DAYS = 3; 