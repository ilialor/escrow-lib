/**
 * Constants used throughout the escrow library
 */

export const PLATFORM_SIGNATURE_ID = 'PLATFORM';

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
  PAID = 'PAID',
  CANCELED = 'CANCELED'
}

export enum UserType {
  CUSTOMER = 'CUSTOMER',
  CONTRACTOR = 'CONTRACTOR',
  PLATFORM = 'PLATFORM'
}

export enum DocumentType {
  DEFINITION_OF_READY = 'DEFINITION_OF_READY',
  DEFINITION_OF_DONE = 'DEFINITION_OF_DONE',
  ROADMAP = 'ROADMAP'
}

export enum MessageType {
  TEXT = 'TEXT',
  FILE = 'FILE',
  SYSTEM = 'SYSTEM'
}

// Minimum number of signatures required to complete an act
export const MIN_SIGNATURES_REQUIRED = 2;

// Percentage threshold for voting to change representative (75%)
export const REP_VOTE_THRESHOLD_PERCENT = 75;

// Maximum message length
export const MAX_MESSAGE_LENGTH = 2000;

// Default pagination sizes
export const DEFAULT_PAGE_SIZE = 20; 