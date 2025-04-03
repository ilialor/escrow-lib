import { Document, DocumentType, Deliverable, ActDocument, ActStatus, DocumentApproval, UserType } from '../interfaces';
import { v4 as uuidv4 } from 'uuid';

/**
 * Service for managing documents and deliverables
 */
export class DocumentService {
  private documents: Map<string, Document> = new Map();
  private deliverables: Map<string, Deliverable> = new Map();
  private acts: Map<string, ActDocument> = new Map();

  /**
   * Create a document
   * @param orderId Order ID
   * @param type Document type
   * @param content Document content
   * @param createdBy Creator's user ID
   * @returns Created document
   */
  async createDocument(
    orderId: string,
    type: DocumentType,
    content: any,
    createdBy: string
  ): Promise<Document> {
    const id = uuidv4();
    const now = new Date();
    
    const document: Document = {
      id,
      orderId,
      type,
      content,
      createdBy,
      createdAt: now,
      updatedAt: now,
      approvals: []
    };

    this.documents.set(id, document);
    return document;
  }

  /**
   * Get document by ID
   * @param documentId Document ID
   * @returns Document or null if not found
   */
  async getDocument(documentId: string): Promise<Document | null> {
    return this.documents.get(documentId) || null;
  }

  /**
   * Get documents by type for an order
   * @param orderId Order ID
   * @param type Document type
   * @returns List of documents
   */
  async getDocumentsByType(orderId: string, type: DocumentType): Promise<Document[]> {
    const documents: Document[] = [];
    
    this.documents.forEach(doc => {
      if (doc.orderId === orderId && doc.type === type) {
        documents.push(doc);
      }
    });
    
    return documents;
  }

  /**
   * Approve a document
   * @param documentId Document ID
   * @param userId User ID approving the document
   * @param comments Optional comments
   * @returns Updated document
   */
  async approveDocument(
    documentId: string,
    userId: string,
    comments?: string
  ): Promise<Document> {
    const document = await this.getDocument(documentId);
    if (!document) {
      throw new Error(`Document with ID ${documentId} not found`);
    }

    const approval: DocumentApproval = {
      userId,
      userType: UserType.PLATFORM, // В реальном приложении это должно быть получено от сервиса пользователей
      approvedAt: new Date(),
      comments
    };

    if (!document.approvals) {
      document.approvals = [];
    }
    
    document.approvals.push(approval);
    document.updatedAt = new Date();
    
    return document;
  }

  /**
   * Submit a deliverable
   * @param userId User ID submitting the deliverable
   * @param orderId Order ID
   * @param phaseId Optional phase ID from roadmap
   * @param title Deliverable title
   * @param details Optional details
   * @param files Optional list of files
   * @returns Created deliverable
   */
  async submitDeliverable(
    userId: string,
    orderId: string,
    phaseId: string | undefined,
    title: string,
    details?: Record<string, any>,
    files?: string[]
  ): Promise<Deliverable> {
    const id = uuidv4();
    
    const deliverable: Deliverable = {
      id,
      orderId,
      phaseId,
      title,
      description: title, // Using title as description by default
      submittedBy: userId,
      submittedAt: new Date(),
      details,
      files
    };

    this.deliverables.set(id, deliverable);
    return deliverable;
  }

  /**
   * Get deliverables for an order
   * @param orderId Order ID
   * @param phaseId Optional phase ID to filter by
   * @returns List of deliverables
   */
  async getDeliverables(orderId: string, phaseId?: string): Promise<Deliverable[]> {
    const deliverables: Deliverable[] = [];
    
    this.deliverables.forEach(deliverable => {
      if (deliverable.orderId === orderId && (!phaseId || deliverable.phaseId === phaseId)) {
        deliverables.push(deliverable);
      }
    });
    
    return deliverables;
  }

  /**
   * Create an act document
   * @param orderId Order ID
   * @param milestoneId Milestone ID
   * @param deliverableIds List of deliverable IDs
   * @param createdBy Creator's user ID
   * @returns Created act document
   */
  async createAct(
    orderId: string,
    milestoneId: string,
    deliverableIds: string[],
    createdBy: string
  ): Promise<ActDocument> {
    const id = uuidv4();
    const now = new Date();
    
    const act: ActDocument = {
      id,
      orderId,
      milestoneId,
      status: ActStatus.CREATED,
      deliverableIds,
      createdBy,
      createdAt: now,
      signatures: []
    };

    this.acts.set(id, act);
    return act;
  }

  /**
   * Get act by ID
   * @param actId Act ID
   * @returns Act document or null if not found
   */
  async getAct(actId: string): Promise<ActDocument | null> {
    return this.acts.get(actId) || null;
  }

  /**
   * Sign an act document
   * @param actId Act ID
   * @param userId User ID signing the act
   * @returns Updated act document
   */
  async signAct(actId: string, userId: string): Promise<ActDocument> {
    const act = await this.getAct(actId);
    if (!act) {
      throw new Error(`Act with ID ${actId} not found`);
    }

    // Add signature
    const signature = {
      userId,
      userType: UserType.CONTRACTOR, // В реальном приложении это должно быть получено от сервиса пользователей
      signedAt: new Date()
    };
    
    if (!act.signatures) {
      act.signatures = [];
    }
    
    act.signatures.push(signature);
    
    // Update status based on signatures
    // In a real system this would be more sophisticated
    if (userId === act.createdBy) {
      act.status = ActStatus.SIGNED_CONTRACTOR;
    } else {
      // Simple assumption - if not contractor, then customer
      act.status = ActStatus.SIGNED_CUSTOMER;
    }
    
    // If both customer and contractor signed, mark as completed
    if (act.signatures.length >= 2) {
      act.status = ActStatus.COMPLETED;
    }
    
    return act;
  }

  /**
   * Get acts for an order
   * @param orderId Order ID
   * @returns List of act documents
   */
  async getActsForOrder(orderId: string): Promise<ActDocument[]> {
    const acts: ActDocument[] = [];
    
    this.acts.forEach(act => {
      if (act.orderId === orderId) {
        acts.push(act);
      }
    });
    
    return acts;
  }
} 