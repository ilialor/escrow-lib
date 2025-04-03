/**
 * Re-export all interfaces from base interfaces
 */
// Export the base interfaces (IUser, IOrder, IDocument, IMilestone, IAct)
export * from './base';

// Re-export content-specific interfaces
export { DoRContent, RoadmapContent, DoDContent } from './DocumentInterfaces';

// Remove Aliases for compatibility - Direct usage of IUser, IOrder, etc. is preferred now
/*
import { IUser, IOrder, IDocument, IMilestone, IAct } from './base';
export type User = IUser;
export type Order = IOrder;
export type Document = IDocument;
export type OrderMilestone = IMilestone;
export type ActDocument = IAct;
export type Deliverable = IDocument; // Deliverable was a Document type
export type DocumentApproval = { userId: string; timestamp: Date; comments?: string }; // Simplified DocumentApproval type
*/

// Re-export services interfaces and types 
// Consider if these are still needed or if services directly use base interfaces
// export * from './services'; 

// Re-export constants - Use direct import from '../utils/constants' where needed
/*
import { UserType, OrderStatus, MilestoneStatus, DocumentType, ActStatus } from '../utils/constants';
export { UserType, OrderStatus, MilestoneStatus, DocumentType, ActStatus };
*/
