/**
 * Types of users in the system
 */
// Removed duplicate enum
/*
export enum UserType {
  CUSTOMER = 'CUSTOMER',
  CONTRACTOR = 'CONTRACTOR',
  PLATFORM = 'PLATFORM'
}
*/

// Import from constants
import { UserType } from '../utils/constants';

// Re-export UserType so other interface files can import it from here if needed
export { UserType };

// Remove the duplicate User interface definition
/*
export interface User {
  id: string;
  name: string;
  type: UserType;
  email?: string;
  avatarUrl?: string;
  createdAt: Date;
  metadata?: Record<string, any>;
} 
*/ 