/**
 * Types of users in the system
 */
export enum UserType {
  /** Customer - creates orders and pays for them */
  CUSTOMER = 'CUSTOMER',
  
  /** Contractor - executes orders */
  CONTRACTOR = 'CONTRACTOR',
  
  /** Platform - administrative user */
  PLATFORM = 'PLATFORM'
}

/**
 * User interface
 */
export interface User {
  /** Unique identifier */
  id: string;
  
  /** User name */
  name: string;
  
  /** User type */
  type: UserType;
  
  /** User email */
  email?: string;
  
  /** User avatar URL */
  avatarUrl?: string;
  
  /** Creation timestamp */
  createdAt: Date;
  
  /** Additional metadata */
  metadata?: Record<string, any>;
} 