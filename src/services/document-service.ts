import { IDocumentService } from '../interfaces/services';
import { IDocument } from '../interfaces/base';
import { Document } from '../models/document';
import { DocumentType } from '../utils/constants';

/**
 * Service for managing order documents
 */
export class DocumentService implements IDocumentService {
  private documents: Map<string, IDocument>;
  private orderService: any; // Will be set via setOrderService method
  private userService: any; // Will be set via setUserService method
  
  constructor() {
    this.documents = new Map<string, IDocument>();
  }
  
  /**
   * Set service instances for cross-service communication
   * @param orderService OrderService instance
   * @param userService UserService instance
   */
  setServices(orderService: any, userService: any): void {
    this.orderService = orderService;
    this.userService = userService;
  }

  /**
   * Create a new document
   * @param orderId Order ID
   * @param documentType Type of document
   * @param content Document content
   * @param createdBy User ID of creator
   * @returns Created document
   */
  async createDocument(
    orderId: string, 
    documentType: DocumentType, 
    content: string, 
    createdBy: string
  ): Promise<IDocument> {
    // Validate inputs
    if (!this.orderService) {
      throw new Error('Order service not initialized');
    }
    
    // Check if order exists
    await this.orderService.getOrder(orderId);
    
    // Check if user exists
    if (this.userService) {
      await this.userService.getUser(createdBy);
    }
    
    // Create document
    const document = new Document(orderId, documentType, content, createdBy);
    this.documents.set(document.id, document);
    
    return document;
  }

  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document instance
   */
  async getDocument(documentId: string): Promise<IDocument> {
    const document = this.documents.get(documentId);
    if (!document) {
      throw new Error(`Document not found: ${documentId}`);
    }
    return document;
  }

  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID approving the document
   * @returns true if document is now approved, false otherwise
   */
  async approveDocument(documentId: string, userId: string): Promise<boolean> {
    // Validate inputs
    const document = await this.getDocument(documentId);
    
    // Check if user exists
    if (this.userService) {
      await this.userService.getUser(userId);
    }
    
    // Approve document
    document.approve(userId);
    
    return document.isApproved();
  }

  /**
   * Update document content
   * @param documentId Document ID
   * @param content New content
   * @param userId User ID making the update
   * @returns Updated document
   */
  async updateDocument(
    documentId: string, 
    content: string, 
    userId: string
  ): Promise<IDocument> {
    // Validate inputs
    const document = await this.getDocument(documentId);
    
    // Check if user exists
    if (this.userService) {
      await this.userService.getUser(userId);
    }
    
    // Update document
    document.updateContent(content, userId);
    
    return document;
  }

  /**
   * Get all documents for an order
   * @param orderId Order ID
   * @returns Map of document types to documents
   */
  async getDocumentsByOrder(orderId: string): Promise<Map<DocumentType, IDocument>> {
    const result = new Map<DocumentType, IDocument>();
    
    for (const document of this.documents.values()) {
      if (document.orderId === orderId) {
        // For each document type, only include the latest version
        const existingDoc = result.get(document.documentType);
        
        if (!existingDoc || existingDoc.version < document.version) {
          result.set(document.documentType, document);
        }
      }
    }
    
    return result;
  }
} 