import { v4 as uuidv4 } from 'uuid';
import { IDocument } from '../interfaces/base';
import { DocumentType } from '../utils/constants';

/**
 * Document class representing documents attached to orders
 */
export class Document implements IDocument {
  id: string;
  orderId: string;
  documentType: DocumentType;
  content: string;
  version: number;
  createdBy: string;
  dateCreated: Date;
  dateUpdated: Date;
  approvals: Set<string>;

  constructor(
    orderId: string,
    documentType: DocumentType,
    content: string,
    createdBy: string,
    id?: string
  ) {
    this.id = id || uuidv4();
    this.orderId = orderId;
    this.documentType = documentType;
    this.content = content;
    this.version = 1;
    this.createdBy = createdBy;
    this.dateCreated = new Date();
    this.dateUpdated = new Date();
    this.approvals = new Set<string>();
    
    // Creator automatically approves the document
    this.approvals.add(createdBy);
  }

  /**
   * Approve document
   * @param userId ID of the approving user
   */
  approve(userId: string): void {
    this.approvals.add(userId);
    this.dateUpdated = new Date();
  }

  /**
   * Check if document has been approved by all required parties
   */
  isApproved(): boolean {
    // Implement your approval logic here
    // For example, if both representative and contractor need to approve
    return this.approvals.size >= 2;
  }

  /**
   * Update document content
   * @param content New content
   * @param userId ID of the user making the update
   */
  updateContent(content: string, userId: string): void {
    this.content = content;
    this.version += 1;
    this.dateUpdated = new Date();
    
    // Clear previous approvals and add current user's approval
    this.approvals.clear();
    this.approvals.add(userId);
  }
} 